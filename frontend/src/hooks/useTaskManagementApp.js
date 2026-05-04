import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_URL, fetchJson, getStoredToken, parseJsonResponse, TOKEN_KEY } from '../utils/api'
import { formatRole, isDueSoon, nextStatus } from '../utils/taskHelpers'

const useTaskManagementApp = () => {
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
  const [token, setToken] = useState(() => getStoredToken())
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

      const response = await fetchJson(`${API_URL}${path}`, {
        ...init,
        headers,
      })

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
        setTasks([])
        throw new Error('Session expired. Please sign in again.')
      }

      if (!response.ok) {
        const errorPayload = await parseJsonResponse(response).catch(() => null)
        const nextMessage =
          errorPayload && typeof errorPayload.message === 'string'
            ? errorPayload.message
            : `Request failed with status ${response.status}.`
        throw new Error(nextMessage)
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
  }, [loadMe, loadTasks, loadUsers, token])

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
  const assignableUsers = useMemo(() => users.filter((item) => item.role === 'employee'), [users])
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
          const response = await fetchJson(`${API_URL}/auth/register`, {
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
          const response = await fetchJson(`${API_URL}/auth/login/request-otp`, {
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
            window.localStorage.setItem(TOKEN_KEY, data.token)
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
          setMessage(
            data?.debugOtp
              ? `${data?.message ?? 'OTP sent to your email.'} Development OTP: ${data.debugOtp}`
              : data?.message ?? 'OTP sent to your email.',
          )
          return
        }

        const response = await fetchJson(`${API_URL}/auth/login/verify-otp`, {
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

        window.localStorage.setItem(TOKEN_KEY, data.token)
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
    window.localStorage.removeItem(TOKEN_KEY)
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
        setTasks((previous) => previous.map((item) => (item.id === id ? updated : item)))
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

  return {
    activeCount,
    activeView,
    adminCount,
    adminDraft,
    adminDraftAssigneeId,
    adminDraftDueDate,
    adminDraftPriority,
    adminDraftStatus,
    adminTaskSaving,
    assignableCount,
    assignableUsers,
    authChallengeId,
    authEmail,
    authLoading,
    authMode,
    authName,
    authOtp,
    authPassword,
    cancelEdit,
    canCompleteTask,
    clearCompleted,
    completionRate,
    completedCount,
    deleteTask,
    draft,
    draftAssigneeId,
    draftDueDate,
    draftPriority,
    draftStatus,
    dueTodayCount,
    editingAssigneeId,
    editingDueDate,
    editingId,
    editingPriority,
    editingStatus,
    editingTitle,
    employeeCount,
    filter,
    filteredTasks,
    formatRole,
    getUserName,
    getUserRole,
    isAdmin,
    isSaving,
    loadMe,
    loadTasks,
    loadUsers,
    loading,
    message,
    notifications,
    onAdminCreateTask,
    onAuthSubmit,
    onCreateTask,
    onLogout,
    ownerFilter: ownershipFilter,
    overdueCount,
    priorityFilter,
    recentTasks,
    resetOtpFlow,
    roleSavingId,
    saveEdit,
    searchQuery,
    setActiveView,
    setAdminDraft,
    setAdminDraftAssigneeId,
    setAdminDraftDueDate,
    setAdminDraftPriority,
    setAdminDraftStatus,
    setAuthChallengeId,
    setAuthEmail,
    setAuthLoading,
    setAuthMode,
    setAuthName,
    setAuthOtp,
    setAuthPassword,
    setDraft,
    setDraftAssigneeId,
    setDraftDueDate,
    setDraftPriority,
    setDraftStatus,
    setEditingAssigneeId,
    setEditingDueDate,
    setEditingPriority,
    setEditingStatus,
    setEditingTitle,
    setFilter,
    setLoading,
    setMessage,
    setOwnershipFilter,
    setPriorityFilter,
    setSearchQuery,
    setShowHomePage,
    showHomePage,
    startEdit,
    tasks,
    token,
    updateTaskStatus,
    updateUserRole,
    user,
    userInitial,
    users,
    validateMessage: message,
  }
}

export default useTaskManagementApp