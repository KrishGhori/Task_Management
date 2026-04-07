import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { parseUser } from '../utils/serializers.js'
import { isAssignableRole } from '../utils/taskValidators.js'

export const listUsers = async (_req, res) => {
  const users = await User.find().sort({ name: 1 }).select('name email role').lean()
  res.json(users.map(parseUser))
}

export const updateUserRole = async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Only admins can manage user roles.' })
    return
  }

  const userId = req.params.id
  const nextRole = req.body?.role

  if (!mongoose.isValidObjectId(userId)) {
    res.status(400).json({ message: 'Invalid user id.' })
    return
  }

  if (!isAssignableRole(nextRole)) {
    res.status(400).json({ message: 'Role must be employee.' })
    return
  }

  const user = await User.findById(userId)
  if (!user) {
    res.status(404).json({ message: 'User not found.' })
    return
  }

  user.role = nextRole
  const updated = await user.save()
  res.json(parseUser(updated))
}
