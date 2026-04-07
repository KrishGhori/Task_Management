import 'dotenv/config'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)
const JWT_SECRET = process.env.JWT_SECRET ?? 'task-management-dev-secret'
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/task_management_web'
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
const OTP_EXPIRES_MS = Number(process.env.OTP_EXPIRES_MS ?? 5 * 60 * 1000)

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT ?? 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM
const mailTransporter =
  smtpHost && smtpUser && smtpPass && smtpFrom
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null

const otpChallenges = new Map()

await mongoose.connect(MONGODB_URI)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'employee'], default: 'employee' },
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

const parseTask = (task) => {
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

const parseUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role ?? 'employee',
})

const isValidPriority = (priority) =>
  priority === 'low' || priority === 'medium' || priority === 'high'

const isValidStatus = (status) =>
  status === 'pending' || status === 'in_progress' || status === 'completed'

const isAssignableRole = (role) => role === 'staff' || role === 'employee'

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

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`

const clearExpiredOtpChallenges = () => {
  const now = Date.now()
  for (const [challengeId, challenge] of otpChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      otpChallenges.delete(challengeId)
    }
  }
}

const otpCleanupTimer = setInterval(clearExpiredOtpChallenges, 60 * 1000)
otpCleanupTimer.unref()

const sendOtpEmail = async ({ to, code, name }) => {
  if (!mailTransporter) {
    throw new Error(
      'Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
    )
  }

  await mailTransporter.sendMail({
    from: smtpFrom,
    to,
    subject: 'Your login OTP code',
    text: `Hello ${name},\n\nYour OTP code is ${code}. It expires in 5 minutes.\n\nIf you did not request this login, ignore this email.`,
    html: `<p>Hello ${name},</p><p>Your OTP code is <strong>${code}</strong>.</p><p>This code expires in 5 minutes.</p><p>If you did not request this login, ignore this email.</p>`,
  })
}

const authRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' })
    return
  }

  const token = authHeader.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(payload.userId).select('name email role').lean()
    if (!user) {
      res.status(401).json({ message: 'Invalid token user.' })
      return
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role ?? 'employee',
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

// CORS: Allow localhost in development, specific origins in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
  : []

const corsOptions = {
  origin: (origin, callback) => {
    // Always allow requests without origin or localhost in development
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true)
      return
    }

    const normalizedOrigin = origin.replace(/\/$/, '')

    // Production: check ALLOWED_ORIGINS env var
    if (ALLOWED_ORIGINS.length > 0) {
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        if (!allowed.includes('*')) {
          return allowed === normalizedOrigin
        }
        const regexPattern = allowed
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
        return new RegExp(`^https?:\\/\\/${regexPattern}(?::\\d+)?$`).test(normalizedOrigin)
      })
      if (isAllowed) {
        callback(null, true)
        return
      }
    }

    console.warn(`CORS rejected: ${origin}`)
    callback(new Error('CORS not allowed'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))

// Debug: Log all incoming requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.get(
        'origin',
      ) || 'none'}`,
    )
  }
  next()
})

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

  if (ADMIN_EMAILS.has(normalizedEmail)) {
    res.status(403).json({ message: 'Admin accounts must be created manually.' })
    return
  }

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
    role: 'employee',
  })
  res.status(201).json({
    user: parseUser(created),
    message: 'Employee account created. Continue with OTP login.',
  })
})

app.post('/api/auth/login/request-otp', async (req, res) => {
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

  const isAdmin = (userRow.role ?? 'employee') === 'admin'
  if (isAdmin) {
    const user = parseUser(userRow)
    const token = createToken(user)
    res.json({
      token,
      user,
      message: 'Admin login successful.',
    })
    return
  }

  clearExpiredOtpChallenges()

  const challengeId = randomUUID()
  const otpCode = generateOtp()

  otpChallenges.set(challengeId, {
    challengeId,
    userId: userRow._id.toString(),
    code: otpCode,
    expiresAt: Date.now() + OTP_EXPIRES_MS,
  })

  try {
    await sendOtpEmail({
      to: userRow.email,
      code: otpCode,
      name: userRow.name,
    })
  } catch (error) {
    otpChallenges.delete(challengeId)
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to send OTP email.',
    })
    return
  }

  res.json({
    challengeId,
    message: 'OTP sent to your email. Verify to complete login.',
  })
})

app.post('/api/auth/login/verify-otp', async (req, res) => {
  const { challengeId, otp } = req.body ?? {}

  if (typeof challengeId !== 'string' || typeof otp !== 'string') {
    res.status(400).json({ message: 'Challenge id and OTP are required.' })
    return
  }

  clearExpiredOtpChallenges()
  const challenge = otpChallenges.get(challengeId)

  if (!challenge) {
    res.status(400).json({ message: 'OTP challenge expired or invalid. Please request a new code.' })
    return
  }

  if (challenge.code !== otp.trim()) {
    res.status(401).json({ message: 'Incorrect OTP.' })
    return
  }

  const userRow = await User.findById(challenge.userId).lean()
  otpChallenges.delete(challengeId)

  if (!userRow) {
    res.status(401).json({ message: 'Invalid account for this OTP challenge.' })
    return
  }

  const user = parseUser(userRow)
  const token = createToken(user)

  res.json({ token, user })
})

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/users', authRequired, async (_req, res) => {
  const users = await User.find().sort({ name: 1 }).select('name email role').lean()
  res.json(users.map(parseUser))
})

app.get('/api/tasks', authRequired, async (req, res) => {
  const tasks = await Task.find({
    $or: [{ userId: req.user.id }, { assigneeId: req.user.id }],
  })
    .sort({ createdAt: -1 })
    .populate('assigneeId', 'name email role')
    .lean()
  res.json(tasks.map(parseTask))
})

app.post('/api/tasks', authRequired, async (req, res) => {
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
      res.status(400).json({ message: 'Tasks can only be assigned to staff or employees.' })
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

  if ((isOwner || req.user.role === 'admin') && normalizedAssigneeId !== undefined && normalizedAssigneeId !== null) {
    const assignee = await User.findById(normalizedAssigneeId).select('role').lean()
    if (!assignee) {
      res.status(400).json({ message: 'Assignee user not found.' })
      return
    }

    if (!isAssignableRole(assignee.role)) {
      res.status(400).json({ message: 'Tasks can only be assigned to staff or employees.' })
      return
    }
  }

  if (nextStatus === 'completed') {
    if (!existing.assigneeId || existing.assigneeId.toString() !== req.user.id || req.user.role !== 'employee') {
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
})

app.put('/api/users/:id/role', authRequired, async (req, res) => {
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
    res.status(400).json({ message: 'Role must be staff or employee.' })
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
