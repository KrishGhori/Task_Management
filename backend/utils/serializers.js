export const parseUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role === 'admin' ? 'admin' : 'employee',
})

export const parseTask = (task) => {
  const assignee = task.assigneeId && typeof task.assigneeId === 'object' ? task.assigneeId : null

  return {
    id: task._id.toString(),
    ownerId: task.userId.toString(),
    assigneeId: assignee ? assignee._id.toString() : task.assigneeId ? task.assigneeId.toString() : null,
    assigneeRole: assignee?.role ?? null,
    title: task.title,
    status: task.status ?? (task.done ? 'completed' : 'pending'),
    done: (task.status ?? (task.done ? 'completed' : 'pending')) === 'completed',
    dueDate: task.dueDate,
    priority: task.priority,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}
