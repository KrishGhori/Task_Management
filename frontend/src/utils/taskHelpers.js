export const formatDueDate = (value) => {
  if (!value) {
    return 'No due date'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'No due date' : parsed.toLocaleDateString()
}

export const formatStatus = (status) => {
  if (status === 'in_progress') {
    return 'In Progress'
  }

  return status[0].toUpperCase() + status.slice(1)
}

export const nextStatus = (status) => {
  if (status === 'pending') {
    return 'in_progress'
  }

  if (status === 'in_progress') {
    return 'completed'
  }

  return 'pending'
}

export const isDueSoon = (dueDate) => {
  if (!dueDate) {
    return false
  }

  const now = Date.now()
  const due = new Date(dueDate).getTime()
  if (Number.isNaN(due)) {
    return false
  }

  return due > now && due - now <= 1000 * 60 * 60 * 24
}

export const formatRole = (role) => {
  if (role === 'admin') {
    return 'Admin'
  }

  return 'Employee'
}