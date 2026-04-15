import cors from 'cors'
import express from 'express'
import authRoutes from './routes/authRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import tasksRoutes from './routes/tasksRoutes.js'
import usersRoutes from './routes/usersRoutes.js'

const app = express()

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'Task Management API',
    health: '/api/health',
  })
})

const corsOptions = {
  origin: (origin, callback) => {
    // Allow all origins as requested by deployment setup.
    callback(null, true)
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

app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health' && !req.app.locals.dbConnected) {
    res.status(503).json({ message: 'Database is unavailable. Please try again later.' })
    return
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
