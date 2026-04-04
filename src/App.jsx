import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api`
const TOKEN_KEY = 'task-management.auth.token'

const formatDueDate = (value) => {
  if (!value) {
    return 'No due date'
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'No due date' : parsed.toLocaleDateString()
}

const formatStatus = (status) => {
  if (status === 'in_progress') {
    return 'In Progress'
  }
  return status[0].toUpperCase() + status.slice(1)
}

const nextStatus = (status) => {
  if (status === 'pending') {
    return 'in_progress'
  }
  if (status === 'in_progress') {
    return 'completed'
  }
  return 'pending'
}

const isDueSoon = (dueDate) => {
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

function App() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [draft, setDraft] = useState('')
  const [draftDueDate, setDraftDueDate] = useState('')
  const [draftPriority, setDraftPriority] = useState('medium')
  const [draftStatus, setDraftStatus] = useState('pending')
  const [draftAssigneeId, setDraftAssigneeId] = useState('')
  const [filter, setFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDueDate, setEditingDueDate] = useState('')
  const [editingPriority, setEditingPriority] = useState('medium')
  const [editingStatus, setEditingStatus] = useState('pending')
  const [editingAssigneeId, setEditingAssigneeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showHomePage, setShowHomePage] = useState(true)

  const authedFetch = useCallback(
    async (path, init) => {
      if (!token) {
        throw new Error('You are not authenticated.')
      }

      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${token}`)
      if (init?.body) {
        headers.set('Content-Type', 'application/json')
      }

      const response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers,
      })

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
        setTasks([])
        throw new Error('Session expired. Please sign in again.')
      }

      return response
    },
    [token],
  )

  const loadTasks = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await authedFetch('/tasks')
      if (!response.ok) {
        throw new Error('Unable to load tasks from server.')
      }

      const data = await response.json()
      setTasks(data)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load tasks.')
    } finally {
      setLoading(false)
    }
  }, [authedFetch, token])

  const loadUsers = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      const response = await authedFetch('/users')
      if (!response.ok) {
        throw new Error('Unable to load users.')
      }

      const data = await response.json()
      setUsers(data)
    } catch {
      setUsers([])
    }
  }, [authedFetch, token])

  const loadMe = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      const response = await authedFetch('/auth/me')
      if (!response.ok) {
        throw new Error('Unable to verify session.')
      }

      const data = await response.json()
      setUser(data.user)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not verify session.')
    }
  }, [authedFetch, token])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    setShowHomePage(false)
    void loadMe()
    void loadUsers()
    void loadTasks()
  }, [loadMe, loadUsers, loadTasks, token])

  const notifications = useMemo(() => {
    if (!user) {
      return []
    }

    const notes = []
    for (const task of tasks) {
      if (task.status === 'completed') {
        continue
      }

      if (task.dueDate) {
        const dueTime = new Date(task.dueDate).getTime()
        if (!Number.isNaN(dueTime) && dueTime < Date.now()) {
          notes.push(`Overdue: ${task.title}`)
          continue
        }
      }

      if (isDueSoon(task.dueDate)) {
        notes.push(`Due soon: ${task.title}`)
      }

      if (task.assigneeId === user.id && task.ownerId !== user.id) {
        notes.push(`Assigned to you: ${task.title}`)
      }
    }

    return notes.slice(0, 4)
  }, [tasks, user])

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return tasks.filter((task) => {
      if (filter !== 'all' && task.status !== filter) {
        return false
      }

      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false
      }

      if (ownershipFilter === 'owned' && task.ownerId !== user?.id) {
        return false
      }

      if (ownershipFilter === 'assigned' && task.assigneeId !== user?.id) {
        return false
      }

      if (query && !task.title.toLowerCase().includes(query)) {
        return false
      }

      return true
    })
  }, [filter, ownershipFilter, priorityFilter, searchQuery, tasks, user?.id])

  const completedCount = tasks.filter((task) => task.status === 'completed').length
  const activeCount = tasks.length - completedCount

  const getUserName = (id) => {
    if (!id) {
      return 'Unassigned'
    }
    const found = users.find((item) => item.id === id)
    return found ? found.name : 'Unknown user'
  }

  const onAuthSubmit = (event) => {
    event.preventDefault()

    const submit = async () => {
      setAuthLoading(true)
      try {
        const payload =
          authMode === 'register'
            ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }
            : { email: authEmail.trim(), password: authPassword }

        const response = await fetch(`${API_URL}/auth/${authMode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message ?? 'Authentication failed.')
        }

        if (authMode === 'register') {
          setShowHomePage(false)
          setAuthMode('login')
          setAuthName('')
          setAuthPassword('')
          setMessage('Account created. Please sign in with your credentials.')
          return
        }

        if (!data.token || !data.user) {
          throw new Error('Authentication failed.')
        }

        localStorage.setItem(TOKEN_KEY, data.token)
        setToken(data.token)
        setUser(data.user)
        setAuthPassword('')
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Authentication failed.')
      } finally {
        setAuthLoading(false)
      }
    }

    
    void submit()
  }

  const onLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setTasks([])
    setShowHomePage(true)
    setMessage('Signed out.')
  }

  const onCreateTask = (event) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) {
      return
    }

    const submit = async () => {
      setIsSaving(true)
      try {
        const response = await authedFetch('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title,
            dueDate: draftDueDate || null,
            priority: draftPriority,
            status: draftStatus,
            assigneeId: draftAssigneeId || null,
          }),
        })

        if (!response.ok) {
          throw new Error('Unable to create task.')
        }

        const created = await response.json()
        setTasks((previous) => [created, ...previous])
        setDraft('')
        setDraftDueDate('')
        setDraftPriority('medium')
        setDraftStatus('pending')
        setDraftAssigneeId('')
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not create task.')
      } finally {
        setIsSaving(false)
      }
    }

    void submit()
  }

  const updateTaskStatus = (id, status) => {
    const submit = async () => {
      try {
        const response = await authedFetch(`/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        })

        if (!response.ok) {
          throw new Error('Unable to update task status.')
        }

        const updated = await response.json()
        setTasks((previous) => previous.map((task) => (task.id === id ? updated : task)))
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not update task status.')
      }
    }

    void submit()
  }

  const deleteTask = (id) => {
    const submit = async () => {
      try {
        const response = await authedFetch(`/tasks/${id}`, { method: 'DELETE' })
        if (!response.ok) {
          throw new Error('Unable to delete task.')
        }

        setTasks((previous) => previous.filter((task) => task.id !== id))
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not delete task.')
      }
    }

    void submit()
  }

  const clearCompleted = () => {
    const submit = async () => {
      try {
        const response = await authedFetch('/tasks/completed', { method: 'DELETE' })
        if (!response.ok) {
          throw new Error('Unable to clear completed tasks.')
        }

        setTasks((previous) => previous.filter((task) => task.status !== 'completed'))
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not clear completed tasks.')
      }
    }

    void submit()
  }

  const startEdit = (task) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
    setEditingDueDate(task.dueDate ?? '')
    setEditingPriority(task.priority)
    setEditingStatus(task.status)
    setEditingAssigneeId(task.assigneeId ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
    setEditingDueDate('')
    setEditingPriority('medium')
    setEditingStatus('pending')
    setEditingAssigneeId('')
  }

  const saveEdit = (task) => {
    const title = editingTitle.trim()
    if (!title) {
      return
    }

    const submit = async () => {
      try {
        const response = await authedFetch(`/tasks/${task.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title,
            dueDate: editingDueDate || null,
            priority: editingPriority,
            status: editingStatus,
            assigneeId: editingAssigneeId || null,
          }),
        })
        if (!response.ok) {
          throw new Error('Unable to save task.')
        }

        const updated = await response.json()
        setTasks((previous) => previous.map((item) => (item.id === task.id ? updated : item)))
        setMessage('')
        cancelEdit()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not save task changes.')
      }
    }

    void submit()
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="kicker">Task Management</p>
        <h1>Plan your day, finish on time.</h1>
        <p className="subtitle">
          Full workflow from basic CRUD to assignment, notifications, and power filters.
        </p>
      </header>

      {!token || !user ? (
        showHomePage ? (
          <section className="card home-card">
            <h2>Organize everything with calm focus</h2>
            <p className="home-subtitle">
              Start simple, then scale into collaborative task execution with deadlines,
              priorities, and assignment.
            </p>

            <div className="home-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setShowHomePage(false)
                  setAuthMode('login')
                  setMessage('')
                }}
              >
                Get Started
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setShowHomePage(false)
                  setAuthMode('register')
                  setMessage('')
                }}
              >
                Create Account
              </button>
            </div>
          </section>
        ) : (
          <section className="card auth-card">
            <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            <form className="auth-form" onSubmit={onAuthSubmit}>
              {authMode === 'register' ? (
                <input
                  type="text"
                  placeholder="Name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  required
                />
              ) : null}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                required
                minLength={6}
              />
              <button type="submit" disabled={authLoading}>
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>
            <button
              type="button"
              className="switch-auth"
              onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
            >
              {authMode === 'login'
                ? 'Need an account? Register'
                : 'Already have an account? Sign in'}
            </button>
          </section>
        )
      ) : (
        <section className="card">
          <div className="top-row">
            <p className="welcome">Signed in as {user.name}</p>
            <button type="button" className="ghost" onClick={onLogout}>
              Logout
            </button>
          </div>

          {notifications.length > 0 ? (
            <section className="notification-panel" aria-label="Notifications">
              {notifications.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </section>
          ) : null}

          <form className="task-form" onSubmit={onCreateTask}>
            <label htmlFor="task-input" className="sr-only">
              New task
            </label>
            <input
              id="task-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a task"
              maxLength={120}
            />
            <input
              type="date"
              value={draftDueDate}
              onChange={(event) => setDraftDueDate(event.target.value)}
              aria-label="Due date"
            />
            <select
              value={draftPriority}
              onChange={(event) => setDraftPriority(event.target.value)}
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
              aria-label="Status"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={draftAssigneeId}
              onChange={(event) => setDraftAssigneeId(event.target.value)}
              aria-label="Assignee"
            >
              <option value="">Unassigned</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Adding...' : 'Add Task'}
            </button>
          </form>

          <div className="toolbar filters-wrap">
            <input
              type="search"
              className="search-input"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search tasks"
            />

            <div className="filters" role="tablist" aria-label="Task status filter">
              {['all', 'pending', 'in_progress', 'completed'].map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={filter === item}
                  className={filter === item ? 'active' : ''}
                  onClick={() => setFilter(item)}
                >
                  {item === 'in_progress' ? 'in progress' : item}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Priority filter"
            >
              <option value="all">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <select
              value={ownershipFilter}
              onChange={(event) => setOwnershipFilter(event.target.value)}
              aria-label="Ownership filter"
            >
              <option value="all">All tasks</option>
              <option value="owned">Owned by me</option>
              <option value="assigned">Assigned to me</option>
            </select>

            <button
              type="button"
              className="ghost"
              onClick={clearCompleted}
              disabled={completedCount === 0}
            >
              Clear Completed
            </button>
          </div>

          {message ? <p className="message">{message}</p> : null}

          <ul className="task-list">
            {loading ? (
              <li className="empty">Loading tasks...</li>
            ) : filteredTasks.length === 0 ? (
              <li className="empty">No tasks found for your current filters.</li>
            ) : (
              filteredTasks.map((task) => (
                <li key={task.id} className={task.status === 'completed' ? 'done' : ''}>
                  <button
                    type="button"
                    className={`status-chip ${task.status}`}
                    onClick={() => updateTaskStatus(task.id, nextStatus(task.status))}
                    aria-label={`Set next status for ${task.title}`}
                  >
                    {formatStatus(task.status)}
                  </button>

                  {editingId === task.id ? (
                    <div className="edit-panel">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        maxLength={120}
                      />
                      <input
                        type="date"
                        value={editingDueDate}
                        onChange={(event) => setEditingDueDate(event.target.value)}
                      />
                      <select
                        value={editingPriority}
                        onChange={(event) => setEditingPriority(event.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <select
                        value={editingStatus}
                        onChange={(event) => setEditingStatus(event.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <select
                        value={editingAssigneeId}
                        onChange={(event) => setEditingAssigneeId(event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {users.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <div className="actions">
                        <button type="button" className="save" onClick={() => saveEdit(task)}>
                          Save
                        </button>
                        <button type="button" className="ghost" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="task-body">
                        <span>{task.title}</span>
                        <small>
                          {formatDueDate(task.dueDate)} | {task.priority} priority | assignee: {getUserName(task.assigneeId)}
                        </small>
                      </div>

                      <div className="actions">
                        <button
                          type="button"
                          className="edit"
                          onClick={() => startEdit(task)}
                          disabled={task.ownerId !== user.id}
                          title={task.ownerId !== user.id ? 'Only task owner can edit details' : 'Edit task'}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete"
                          onClick={() => deleteTask(task.id)}
                          disabled={task.ownerId !== user.id}
                          title={task.ownerId !== user.id ? 'Only task owner can delete' : 'Delete task'}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>

          <footer className="status">
            <p>
              {activeCount} active, {completedCount} completed
            </p>
            <p>{tasks.length} total tasks</p>
          </footer>

          <div className="mobile-actions" aria-label="Mobile quick actions">
            <button type="button" className="ghost" onClick={() => setShowHomePage(true)}>
              Home
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => document.getElementById('task-input')?.focus()}
            >
              Add Task
            </button>
            <button type="button" className="ghost" onClick={clearCompleted}>
              Clear
            </button>
          </div>
        </section>
      )}

      {message && (!token || !user) ? <p className="message">{message}</p> : null}
    </main>
  )
}

export default App
