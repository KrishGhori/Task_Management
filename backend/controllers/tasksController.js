import mongoose from 'mongoose'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { parseTask } from '../utils/serializers.js'
import {
  isAssignableRole,
  isValidPriority,
  isValidStatus,
  normalizeAssigneeId,
} from '../utils/taskValidators.js'

export const listTasks = async (req, res) => {
  const tasks = await Task.find({
    $or: [{ userId: req.user.id }, { assigneeId: req.user.id }],
  })
    .sort({ createdAt: -1 })
    .populate('assigneeId', 'name email role')
    .lean()
  res.json(tasks.map(parseTask))
}

export const createTask = async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Only admins can create tasks.' })
    return
  }

  const {
    title,
    dueDate = null,
    priority = 'medium',
    status = 'pending',
    assigneeId,
  } = req.body ?? {}

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ message: 'Title is required.' })
    return
  }

  if (!isValidPriority(priority)) {
    res.status(400).json({ message: 'Priority must be low, medium, or high.' })
    return
  }

  if (!isValidStatus(status)) {
    res.status(400).json({ message: 'Status must be pending, in_progress, or completed.' })
    return
  }

  const normalizedAssigneeId = normalizeAssigneeId(assigneeId)
  if (normalizedAssigneeId === 'invalid') {
    res.status(400).json({ message: 'Assignee id is invalid.' })
    return
  }

  if (normalizedAssigneeId !== undefined && req.user.role !== 'admin') {
    res.status(403).json({ message: 'Only admins can assign tasks.' })
    return
  }

  if (normalizedAssigneeId) {
    const assignee = await User.findById(normalizedAssigneeId).select('role').lean()
    if (!assignee) {
      res.status(400).json({ message: 'Assignee user not found.' })
      return
    }

    if (!isAssignableRole(assignee.role)) {
      res.status(400).json({ message: 'Tasks can only be assigned to employees.' })
      return
    }
  }

  const task = await Task.create({
    userId: req.user.id,
    assigneeId: normalizedAssigneeId ?? null,
    title: title.trim(),
    status,
    dueDate,
    priority,
  })

  await task.populate('assigneeId', 'name email role')
  res.status(201).json(parseTask(task))
}

export const updateTask = async (req, res) => {
  const taskId = req.params.id

  if (!mongoose.isValidObjectId(taskId)) {
    res.status(400).json({ message: 'Invalid task id.' })
    return
  }

  const existing = await Task.findOne({
    _id: taskId,
    $or: [{ userId: req.user.id }, { assigneeId: req.user.id }],
  })
  if (!existing) {
    res.status(404).json({ message: 'Task not found.' })
    return
  }

  if (existing.status === 'completed') {
    res.status(403).json({ message: 'Completed tasks cannot be changed.' })
    return
  }

  const isOwner = existing.userId.toString() === req.user.id

  const nextTitle =
    typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim()
      : existing.title

  const requestedStatus =
    typeof req.body?.status === 'string'
      ? req.body.status
      : typeof req.body?.done === 'boolean'
        ? req.body.done
          ? 'completed'
          : 'pending'
        : existing.status

  const nextStatus = requestedStatus ?? 'pending'
  const nextDueDate = req.body?.dueDate === undefined ? existing.dueDate : req.body.dueDate
  const nextPriority = req.body?.priority ?? existing.priority
  const normalizedAssigneeId = normalizeAssigneeId(req.body?.assigneeId)

  if (!isValidPriority(nextPriority)) {
    res.status(400).json({ message: 'Priority must be low, medium, or high.' })
    return
  }

  if (!isValidStatus(nextStatus)) {
    res.status(400).json({ message: 'Status must be pending, in_progress, or completed.' })
    return
  }

  if (normalizedAssigneeId === 'invalid') {
    res.status(400).json({ message: 'Assignee id is invalid.' })
    return
  }

  if (req.body?.assigneeId !== undefined && req.user.role !== 'admin') {
    res.status(403).json({ message: 'Only admins can reassign tasks.' })
    return
  }

  if (!isOwner) {
    const ownerOnlyFieldsUpdated =
      req.body?.title !== undefined ||
      req.body?.dueDate !== undefined ||
      req.body?.priority !== undefined ||
      (req.body?.assigneeId !== undefined && req.user.role !== 'admin')

    if (ownerOnlyFieldsUpdated) {
      res.status(403).json({ message: 'Only task owner can edit title, due date, priority, or assignee.' })
      return
    }
  }

  if (
    (isOwner || req.user.role === 'admin') &&
    normalizedAssigneeId !== undefined &&
    normalizedAssigneeId !== null
  ) {
    const assignee = await User.findById(normalizedAssigneeId).select('role').lean()
    if (!assignee) {
      res.status(400).json({ message: 'Assignee user not found.' })
      return
    }

    if (!isAssignableRole(assignee.role)) {
      res.status(400).json({ message: 'Tasks can only be assigned to employees.' })
      return
    }
  }

  if (nextStatus === 'completed') {
    if (
      !existing.assigneeId ||
      existing.assigneeId.toString() !== req.user.id ||
      req.user.role !== 'employee'
    ) {
      res.status(403).json({ message: 'Only the assigned employee can complete this task.' })
      return
    }

    const assignee = await User.findById(existing.assigneeId).select('role').lean()
    if (!assignee || assignee.role !== 'employee') {
      res.status(403).json({ message: 'Only the assigned employee can complete this task.' })
      return
    }
  }

  existing.title = nextTitle
  existing.status = nextStatus
  existing.dueDate = nextDueDate
  existing.priority = nextPriority
  if ((isOwner || req.user.role === 'admin') && normalizedAssigneeId !== undefined) {
    existing.assigneeId = normalizedAssigneeId
  }
  const updated = await existing.save()
  await updated.populate('assigneeId', 'name email role')
  res.json(parseTask(updated))
}

export const deleteTask = async (req, res) => {
  const taskId = req.params.id
  if (!mongoose.isValidObjectId(taskId)) {
    res.status(400).json({ message: 'Invalid task id.' })
    return
  }

  const result = await Task.deleteOne({ _id: taskId, userId: req.user.id })
  if (result.deletedCount === 0) {
    res.status(404).json({ message: 'Task not found.' })
    return
  }

  res.status(204).send()
}

export const deleteCompletedTasks = async (req, res) => {
  const result = await Task.deleteMany({ status: 'completed', userId: req.user.id })
  res.json({ removed: result.deletedCount ?? 0 })
}
