import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

// API URL: Use VITE_API_URL env var, or derive from current origin
const normalizeApiBaseUrl = (value) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${normalizeApiBaseUrl(import.meta.env.VITE_API_URL)}/api`
  }

  if (import.meta.env.PROD) {
    return 'https://task-managment-mw6o.vercel.app/api'
  }

  // Fallback: if deployed, use same origin; otherwise use localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production: use same origin with API port (or assume relative path)
    return `${window.location.protocol}//${window.location.host}/api`
  }
  
  // Development: use localhost:4000
  return 'http://localhost:4000/api'
}

const API_URL = getApiUrl()
const TOKEN_KEY = 'task-management.auth.token'

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''
  const bodyText = await response.text()

  if (!bodyText) {
    return null
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      `Server returned non-JSON response from ${response.url || 'the API'}. Set VITE_API_URL to your deployed backend URL.`,
    )
  }

  try {
    return JSON.parse(bodyText)
  } catch {
    throw new Error('Server returned invalid JSON response.')
  }
}

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

const formatRole = (role) => {
  if (role === 'admin') {
    return 'Admin'
  }

  return 'Employee'
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
  const [authOtp, setAuthOtp] = useState('')
  const [authChallengeId, setAuthChallengeId] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showHomePage, setShowHomePage] = useState(true)
  const [activeView, setActiveView] = useState('tasks')
  const [adminDraft, setAdminDraft] = useState('')
  const [adminDraftDueDate, setAdminDraftDueDate] = useState('')
  const [adminDraftPriority, setAdminDraftPriority] = useState('medium')
  const [adminDraftStatus, setAdminDraftStatus] = useState('pending')
  const [adminDraftAssigneeId, setAdminDraftAssigneeId] = useState('')
  const [adminTaskSaving, setAdminTaskSaving] = useState(false)
  const [roleSavingId, setRoleSavingId] = useState(null)

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

      if (!response.ok) {
        const errorPayload = await parseJsonResponse(response).catch(() => null)
        const message =
          errorPayload && typeof errorPayload.message === 'string'
            ? errorPayload.message
            : `Request failed with status ${response.status}.`
        throw new Error(message)
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
      const data = await parseJsonResponse(response)
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
      const data = await parseJsonResponse(response)
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
      const data = await parseJsonResponse(response)
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
  const assignedCount = tasks.filter((task) => task.assigneeId === user?.id).length

  const overdueCount = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.dueDate || task.status === 'completed') {
          return false
        }
        const due = new Date(task.dueDate).getTime()
        return !Number.isNaN(due) && due < Date.now()
      }).length,
    [tasks],
  )

  const dueTodayCount = useMemo(() => {
    const today = new Date()
    return tasks.filter((task) => {
      if (!task.dueDate || task.status === 'completed') {
        return false
      }
      const due = new Date(task.dueDate)
      return (
        due.getFullYear() === today.getFullYear() &&
        due.getMonth() === today.getMonth() &&
        due.getDate() === today.getDate()
      )
    }).length
  }, [tasks])

  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  const userInitial = useMemo(() => {
    if (!user?.name) {
      return 'U'
    }
    return user.name.trim().charAt(0).toUpperCase()
  }, [user?.name])

  const recentTasks = useMemo(() => tasks.slice(0, 5), [tasks])

  const isAdmin = user?.role === 'admin'

  const assignableUsers = useMemo(
    () => users.filter((item) => item.role === 'employee'),
    [users],
  )

  const adminCount = users.filter((item) => item.role === 'admin').length
  const employeeCount = users.filter((item) => item.role === 'employee').length
  const assignableCount = assignableUsers.length

  const getUserName = (id) => {
    if (!id) {
      return 'Unassigned'
    }
    const found = users.find((item) => item.id === id)
    return found ? found.name : 'Unknown user'
  }

  const getUserRole = (id) => {
    const found = users.find((item) => item.id === id)
    return found?.role ?? 'employee'
  }

  const canCompleteTask = (task) => task.assigneeId === user?.id && user?.role === 'employee'

  const resetOtpFlow = () => {
    setAuthOtp('')
    setAuthChallengeId('')
  }

  const onAuthSubmit = (event) => {
    event.preventDefault()

    const submit = async () => {
      setAuthLoading(true)
      try {
        if (authMode === 'register') {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
            }),
          })

          const data = await parseJsonResponse(response)
          if (!response.ok) {
            throw new Error(data?.message ?? 'Registration failed.')
          }

          setShowHomePage(false)
          setAuthMode('login')
          setAuthName('')
          setAuthPassword('')
          resetOtpFlow()
          setMessage(data?.message ?? 'Employee account created. Please sign in using OTP.')
          return
        }

        if (!authChallengeId) {
          const response = await fetch(`${API_URL}/auth/login/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: authEmail.trim(),
              password: authPassword,
            }),
          })

          const data = await parseJsonResponse(response)
          if (!response.ok) {
            throw new Error(data?.message ?? 'Unable to send OTP.')
          }

          if (data?.token && data?.user) {
            localStorage.setItem(TOKEN_KEY, data.token)
            setToken(data.token)
            setUser(data.user)
            setAuthPassword('')
            resetOtpFlow()
            setMessage('')
            return
          }

          if (!data?.challengeId) {
            throw new Error('OTP request failed. Try again.')
          }

          setAuthChallengeId(data.challengeId)
          setMessage(data?.message ?? 'OTP sent to your email.')
          return
        }

        const response = await fetch(`${API_URL}/auth/login/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: authChallengeId,
            otp: authOtp.trim(),
          }),
        })

        const data = await parseJsonResponse(response)
        if (!response.ok) {
          throw new Error(data?.message ?? 'OTP verification failed.')
        }

        if (!data.token || !data.user) {
          throw new Error('Authentication failed.')
        }

        localStorage.setItem(TOKEN_KEY, data.token)
        setToken(data.token)
        setUser(data.user)
        setAuthPassword('')
        resetOtpFlow()
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
    setActiveView('tasks')
    setDraftAssigneeId('')
    setAdminDraft('')
    setAdminDraftDueDate('')
    setAdminDraftPriority('medium')
    setAdminDraftStatus('pending')
    setAdminDraftAssigneeId('')
    setAdminTaskSaving(false)
    setRoleSavingId(null)
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
            assigneeId: isAdmin ? draftAssigneeId || null : undefined,
          }),
        })

        const created = await parseJsonResponse(response)
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

  const onAdminCreateTask = (event) => {
    event.preventDefault()

    const title = adminDraft.trim()
    if (!title) {
      return
    }

    const submit = async () => {
      setAdminTaskSaving(true)
      try {
        const response = await authedFetch('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title,
            dueDate: adminDraftDueDate || null,
            priority: adminDraftPriority,
            status: adminDraftStatus,
            assigneeId: adminDraftAssigneeId || null,
          }),
        })

        const created = await parseJsonResponse(response)
        setTasks((previous) => [created, ...previous])
        setAdminDraft('')
        setAdminDraftDueDate('')
        setAdminDraftPriority('medium')
        setAdminDraftStatus('pending')
        setAdminDraftAssigneeId('')
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not create assigned task.')
      } finally {
        setAdminTaskSaving(false)
      }
    }

    void submit()
  }

  const updateTaskStatus = (id, status) => {
    const submit = async () => {
      const task = tasks.find((item) => item.id === id)
      if (status === 'completed' && task && !canCompleteTask(task)) {
        setMessage('Only the assigned employee can complete this task.')
        return
      }

      try {
        const response = await authedFetch(`/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        })

        const updated = await parseJsonResponse(response)
        setTasks((previous) => previous.map((task) => (task.id === id ? updated : task)))
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not update task status.')
      }
    }

    void submit()
  }

  const updateUserRole = (id, nextRole) => {
    const submit = async () => {
      setRoleSavingId(id)
      try {
        const response = await authedFetch(`/users/${id}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role: nextRole }),
        })

        const updated = await parseJsonResponse(response)
        setUsers((previous) => previous.map((item) => (item.id === id ? updated : item)))
        if (user?.id === id) {
          setUser((previous) => (previous ? { ...previous, role: updated.role } : previous))
        }
        setMessage('')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not update user role.')
      } finally {
        setRoleSavingId(null)
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
    if (task.status === 'completed') {
      setMessage('Completed tasks cannot be changed.')
      return
    }

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
    if (task.status === 'completed') {
      setMessage('Completed tasks cannot be changed.')
      cancelEdit()
      return
    }

    const title = editingTitle.trim()
    if (!title) {
      return
    }

    const submit = async () => {
      try {
        const payload = {
          title,
          dueDate: editingDueDate || null,
          priority: editingPriority,
          status: editingStatus,
        }

        if (isAdmin) {
          payload.assigneeId = editingAssigneeId || null
        }

        const response = await authedFetch(`/tasks/${task.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })

        const updated = await parseJsonResponse(response)
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
                  resetOtpFlow()
                  setAuthPassword('')
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
                  resetOtpFlow()
                  setAuthPassword('')
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
            {authMode === 'login' ? (
              <p className="home-subtitle">Admins log in directly. Employees receive OTP on email.</p>
            ) : (
              <p className="home-subtitle">Registration creates employee accounts only.</p>
            )}
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
                disabled={authMode === 'login' && Boolean(authChallengeId)}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                required
                minLength={6}
                disabled={authMode === 'login' && Boolean(authChallengeId)}
              />

              {authMode === 'login' && authChallengeId ? (
                <>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={authOtp}
                    onChange={(event) => setAuthOtp(event.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      resetOtpFlow()
                      setMessage('Enter credentials to request a new OTP.')
                    }}
                    disabled={authLoading}
                  >
                    Change Credentials
                  </button>
                </>
              ) : null}

              <button type="submit" disabled={authLoading}>
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? authChallengeId
                      ? 'Verify OTP'
                      : 'Send OTP'
                    : 'Create Account'}
              </button>
            </form>
            <button
              type="button"
              className="switch-auth"
              onClick={() => {
                setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))
                resetOtpFlow()
                setAuthPassword('')
                setMessage('')
              }}
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
            <div className="top-actions">
              <button
                type="button"
                className={`ghost ${activeView === 'tasks' ? 'active-nav' : ''}`}
                onClick={() => setActiveView('tasks')}
              >
                Tasks
              </button>
              <button
                type="button"
                className={`ghost ${activeView === 'profile' ? 'active-nav' : ''}`}
                onClick={() => setActiveView('profile')}
              >
                Profile
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className={`ghost ${activeView === 'admin' ? 'active-nav' : ''}`}
                  onClick={() => setActiveView('admin')}
                >
                  Admin
                </button>
              ) : null}
              <button type="button" className="ghost" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>

          {message ? <p className="message">{message}</p> : null}

          {activeView === 'admin' && isAdmin ? (
            <section className="admin-view" aria-label="Admin workspace">
              <header className="admin-header">
                <div>
                  <p className="kicker">Admin section</p>
                  <h2>Assign work to employees</h2>
                  <p className="subtitle">
                    Only admins can assign tasks. Only employees can complete assigned work.
                  </p>
                </div>

                <div className="profile-stats admin-stats">
                  <article>
                    <h3>Users</h3>
                    <p>{users.length}</p>
                  </article>
                  <article>
                    <h3>Admins</h3>
                    <p>{adminCount}</p>
                  </article>
                  <article>
                    <h3>Employees</h3>
                    <p>{employeeCount}</p>
                  </article>
                </div>
              </header>

              <div className="profile-grid admin-grid">
                <article className="profile-panel">
                  <h3>Team roles</h3>
                  <p>This workspace supports only admin and employee roles.</p>

                  <ul className="team-list">
                    {users.map((item) => (
                      <li key={item.id} className="team-row">
                        <div>
                          <strong>{item.name}</strong>
                          <small>
                            {item.email} · <span className={`role-badge ${item.role}`}>{formatRole(item.role)}</span>
                          </small>
                        </div>

                        {item.role === 'admin' ? (
                          <span className="role-lock">Admin account</span>
                        ) : (
                          <div className="team-actions">
                            <button
                              type="button"
                              className={`ghost ${item.role === 'employee' ? 'active-nav' : ''}`}
                              onClick={() => updateUserRole(item.id, 'employee')}
                              disabled={roleSavingId === item.id || item.role === 'employee'}
                            >
                              Set as Employee
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="profile-panel">
                  <h3>Assign task</h3>
                  <p>Use this form to assign work only to employees.</p>

                  <form className="task-form admin-task-form" onSubmit={onAdminCreateTask}>
                    <label htmlFor="admin-task-input" className="sr-only">
                      Task title
                    </label>
                    <input
                      id="admin-task-input"
                      type="text"
                      value={adminDraft}
                      onChange={(event) => setAdminDraft(event.target.value)}
                      placeholder="Add an assigned task"
                      maxLength={120}
                    />
                    <input
                      type="date"
                      value={adminDraftDueDate}
                      onChange={(event) => setAdminDraftDueDate(event.target.value)}
                      aria-label="Admin due date"
                    />
                    <select
                      value={adminDraftPriority}
                      onChange={(event) => setAdminDraftPriority(event.target.value)}
                      aria-label="Admin priority"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select
                      value={adminDraftStatus}
                      onChange={(event) => setAdminDraftStatus(event.target.value)}
                      aria-label="Admin status"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                    </select>
                    <select
                      value={adminDraftAssigneeId}
                      onChange={(event) => setAdminDraftAssigneeId(event.target.value)}
                      aria-label="Assign to user"
                      required
                    >
                      <option value="" disabled hidden>
                        Select employee
                      </option>
                      {assignableUsers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatRole(item.role)})
                        </option>
                      ))}
                    </select>
                    <button type="submit" disabled={adminTaskSaving || assignableUsers.length === 0}>
                      {adminTaskSaving ? 'Assigning...' : 'Assign Task'}
                    </button>
                  </form>

                  <p className="admin-note">Assignable users: {assignableCount}</p>
                </article>
              </div>
            </section>
          ) : activeView === 'profile' ? (
            <section className="profile-view" aria-label="Profile page">
              <header className="profile-header">
                <div className="profile-avatar" aria-hidden="true">
                  {userInitial}
                </div>
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                  <p>Role: {formatRole(user.role)}</p>
                </div>
              </header>

              <div className="profile-stats">
                <article>
                  <h3>Total Tasks</h3>
                  <p>{tasks.length}</p>
                </article>
                <article>
                  <h3>Completed</h3>
                  <p>{completedCount}</p>
                </article>
                <article>
                  <h3>Assigned To You</h3>
                  <p>{assignedCount}</p>
                </article>
                <article>
                  <h3>Completion Rate</h3>
                  <p>{completionRate}%</p>
                </article>
              </div>

              <div className="profile-grid">
                <article className="profile-panel">
                  <h3>Account Summary</h3>
                  <p>You are actively collaborating with your team across all priorities.</p>
                  <ul>
                    <li>Due today: {dueTodayCount}</li>
                    <li>Overdue: {overdueCount}</li>
                    <li>In progress: {tasks.filter((task) => task.status === 'in_progress').length}</li>
                    <li>Pending: {tasks.filter((task) => task.status === 'pending').length}</li>
                  </ul>
                </article>

                <article className="profile-panel">
                  <h3>Recent Tasks</h3>
                  {recentTasks.length === 0 ? (
                    <p>No tasks yet. Add your first task from the Tasks tab.</p>
                  ) : (
                    <ul className="profile-recent-list">
                      {recentTasks.map((task) => (
                        <li key={task.id}>
                          <span>{task.title}</span>
                          <small>
                            {formatStatus(task.status)} | {task.priority} | {formatDueDate(task.dueDate)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            </section>
          ) : (
            <>
              {notifications.length > 0 ? (
                <section className="notification-panel" aria-label="Notifications">
                  {notifications.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </section>
              ) : null}

              {isAdmin ? (
                <form className="task-form task-form-admin" onSubmit={onCreateTask}>
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
                    aria-label="Assign to employee"
                  >
                    <option value="">Assign to employee (optional)</option>
                    {assignableUsers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatRole(item.role)})
                      </option>
                    ))}
                  </select>

                  <button type="submit" disabled={isSaving}>
                    {isSaving ? 'Adding...' : 'Add / Assign Task'}
                  </button>
                </form>
              ) : null}

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
                        onClick={() => {
                          if (task.status === 'in_progress' && !canCompleteTask(task)) {
                            setMessage('Only the assigned employee can complete this task.')
                            return
                          }

                          if (task.status !== 'completed') {
                            updateTaskStatus(task.id, nextStatus(task.status))
                          }
                        }}
                        disabled={task.status === 'completed' || (task.status === 'in_progress' && !canCompleteTask(task))}
                        aria-label={`Set next status for ${task.title}`}
                      >
                        {formatStatus(task.status)}
                      </button>

                      {editingId === task.id && task.status !== 'completed' ? (
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
                          {isAdmin ? (
                            <select
                              value={editingAssigneeId}
                              onChange={(event) => setEditingAssigneeId(event.target.value)}
                            >
                              <option value="" disabled hidden>
                                Select assignee
                              </option>
                              {assignableUsers.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({formatRole(item.role)})
                                </option>
                              ))}
                            </select>
                          ) : null}
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
                              {task.assigneeId ? ` (${formatRole(getUserRole(task.assigneeId))})` : ''}
                            </small>
                          </div>

                          <div className="actions">
                            <button
                              type="button"
                              className="edit"
                              onClick={() => startEdit(task)}
                              disabled={task.ownerId !== user.id || task.status === 'completed'}
                              title={
                                task.status === 'completed'
                                  ? 'Completed tasks cannot be changed'
                                  : task.ownerId !== user.id
                                    ? 'Only task owner can edit details'
                                    : 'Edit task'
                              }
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
            </>
          )}
        </section>
      )}

      {message && (!token || !user) ? <p className="message">{message}</p> : null}
    </main>
  )
}

export default App
