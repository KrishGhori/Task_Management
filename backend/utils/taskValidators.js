import mongoose from 'mongoose'

export const isValidPriority = (priority) =>
  priority === 'low' || priority === 'medium' || priority === 'high'

export const isValidStatus = (status) =>
  status === 'pending' || status === 'in_progress' || status === 'completed'

export const isAssignableRole = (role) => role === 'employee'

export const normalizeAssigneeId = (assigneeId) => {
  if (assigneeId === undefined) {
    return undefined
  }

  if (assigneeId === null || assigneeId === '') {
    return null
  }

  if (!mongoose.isValidObjectId(assigneeId)) {
    return 'invalid'
  }

  return assigneeId
}
