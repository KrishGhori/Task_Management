import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { ADMIN_EMAILS, JWT_SECRET, OTP_EXPIRES_MS } from '../config/env.js'
import { sendOtpEmail } from '../config/mail.js'
import { Profile } from '../models/Profile.js'
import { User } from '../models/User.js'
import { parseUser } from '../utils/serializers.js'

const otpChallenges = new Map()

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

export const register = async (req, res) => {
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

  await Profile.create({
    userId: created._id,
    displayName: created.name,
  })

  res.status(201).json({
    user: parseUser(created),
    message: 'Employee account created. Continue with OTP login.',
  })
}

export const requestOtp = async (req, res) => {
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
}

export const verifyOtp = async (req, res) => {
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
}

export const me = async (req, res) => {
  res.json({ user: req.user })
}

export const updateMe = async (req, res) => {
  const { name, email, password } = req.body ?? {}

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    res.status(400).json({ message: 'Name must be a non-empty string.' })
    return
  }

  if (email !== undefined && (typeof email !== 'string' || !email.trim())) {
    res.status(400).json({ message: 'Email must be a non-empty string.' })
    return
  }

  if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
    res.status(400).json({ message: 'Password must be at least 6 characters.' })
    return
  }

  if (name === undefined && email === undefined && password === undefined) {
    res.status(400).json({ message: 'Nothing to update.' })
    return
  }

  const user = await User.findById(req.user.id)
  if (!user) {
    res.status(404).json({ message: 'User not found.' })
    return
  }

  if (name !== undefined) {
    user.name = name.trim()
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    })
      .select('_id')
      .lean()

    if (existing) {
      res.status(409).json({ message: 'Email is already registered.' })
      return
    }

    user.email = normalizedEmail
  }

  if (password !== undefined) {
    user.passwordHash = await bcrypt.hash(password, 10)
  }

  const updated = await user.save()
  res.json({ user: parseUser(updated), message: 'Profile updated successfully.' })
}
