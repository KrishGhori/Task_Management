import cors from 'cors'
import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)
const JWT_SECRET = process.env.JWT_SECRET ?? 'task-management-dev-secret'
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/task_management_web'

await mongoose.connect(MONGODB_URI)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
)

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)
const Task = mongoose.model('Task', taskSchema)

const parseTask = (task) => ({
  id: task._id.toString(),
  ownerId: task.userId.toString(),
  assigneeId: task.assigneeId ? task.assigneeId.toString() : null,
  title: task.title,
  status: task.status ?? (task.done ? 'completed' : 'pending'),
  done: (task.status ?? (task.done ? 'completed' : 'pending')) === 'completed',
  dueDate: task.dueDate,
  priority: task.priority,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
})

const parseUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
})

const isValidPriority = (priority) =>
  priority === 'low' || priority === 'medium' || priority === 'high'

const isValidStatus = (status) =>
  status === 'pending' || status === 'in_progress' || status === 'completed'

const normalizeAssigneeId = (assigneeId) => {
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

const createToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  })

const authRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' })
    return
  }

  const token = authHeader.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(payload.userId).select('name email').lean()
    if (!user) {
      res.status(401).json({ message: 'Invalid token user.' })
      return
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

// CORS: Allow localhost in development, specific origins in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : []

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true // Allow requests without origin (like mobile apps, curl, etc.)
  }

  // Development: allow localhost variants
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true
  }

  // Production: check ALLOWED_ORIGINS env var
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.some((allowed) => {
      // Support wildcards: example.com* matches example.com and subdomain.example.com
      const regexPattern = allowed
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
      return new RegExp(`^https?:\/\/${regexPattern}(:\d+)?$`).test(origin)
    })
  }

  return false
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      console.warn(`CORS blocked origin: ${origin}`)
      callback(new Error('CORS origin not allowed'))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body ?? {}

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ message: 'Name is required.' })
    return
  }

  if (typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ message: 'Email is required.' })
    return
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters.' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await User.findOne({ email: normalizedEmail }).select('_id').lean()
  if (existing) {
    res.status(409).json({ message: 'Email is already registered.' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const created = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  })
  const user = parseUser(created)
  const token = createToken(user)

  res.status(201).json({
    token,
    user,
  })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ message: 'Email and password are required.' })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  const userRow = await User.findOne({ email: normalizedEmail }).lean()
  if (!userRow) {
    res.status(401).json({ message: 'Invalid credentials.' })
    return
  }

  const matches = await bcrypt.compare(password, userRow.passwordHash)
  if (!matches) {
    res.status(401).json({ message: 'Invalid credentials.' })
    return
  }

  const user = { id: userRow._id.toString(), name: userRow.name, email: userRow.email }
  const token = createToken(user)

  res.json({ token, user })
})

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/users', authRequired, async (_req, res) => {
  const users = await User.find().sort({ name: 1 }).select('name email').lean()
  res.json(users.map(parseUser))
})

app.get('/api/tasks', authRequired, async (req, res) => {
  const tasks = await Task.find({
    $or: [{ userId: req.user.id }, { assigneeId: req.user.id }],
  })
    .sort({ createdAt: -1 })
    .lean()
  res.json(tasks.map(parseTask))
})

app.post('/api/tasks', authRequired, async (req, res) => {
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

  if (normalizedAssigneeId) {
    const assigneeExists = await User.exists({ _id: normalizedAssigneeId })
    if (!assigneeExists) {
      res.status(400).json({ message: 'Assignee user not found.' })
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

  res.status(201).json(parseTask(task))
})

app.put('/api/tasks/:id', authRequired, async (req, res) => {
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

  if (!isOwner) {
    const ownerOnlyFieldsUpdated =
      req.body?.title !== undefined ||
      req.body?.dueDate !== undefined ||
      req.body?.priority !== undefined ||
      req.body?.assigneeId !== undefined

    if (ownerOnlyFieldsUpdated) {
      res.status(403).json({ message: 'Only task owner can edit title, due date, priority, or assignee.' })
      return
    }
  }

  if (isOwner && normalizedAssigneeId !== undefined && normalizedAssigneeId !== null) {
    const assigneeExists = await User.exists({ _id: normalizedAssigneeId })
    if (!assigneeExists) {
      res.status(400).json({ message: 'Assignee user not found.' })
      return
    }
  }

  existing.title = nextTitle
  existing.status = nextStatus
  existing.dueDate = nextDueDate
  existing.priority = nextPriority
  if (isOwner && normalizedAssigneeId !== undefined) {
    existing.assigneeId = normalizedAssigneeId
  }
  const updated = await existing.save()
  res.json(parseTask(updated))
})

app.delete('/api/tasks/:id', authRequired, async (req, res) => {
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
})

app.delete('/api/tasks/completed', authRequired, async (req, res) => {
  const result = await Task.deleteMany({ status: 'completed', userId: req.user.id })
  res.json({ removed: result.deletedCount ?? 0 })
})

app.listen(PORT, () => {
  console.log(`Task API server running on http://localhost:${PORT}`)
  console.log(`Connected MongoDB: ${MONGODB_URI}`)
})
