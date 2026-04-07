import cors from 'cors'
import express from 'express'
import { ALLOWED_ORIGINS } from './config/env.js'
import authRoutes from './routes/authRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import tasksRoutes from './routes/tasksRoutes.js'
import usersRoutes from './routes/usersRoutes.js'

const app = express()

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true)
      return
    }

    const normalizedOrigin = origin.replace(/\/$/, '')

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

app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`,
    )
  }
  next()
})

app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/tasks', tasksRoutes)

export default app
