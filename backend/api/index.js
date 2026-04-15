import app from '../app.js'
import { connectDB } from '../config/db.js'
import { User } from '../models/User.js'

let initPromise = null
let rolesNormalized = false

async function initializeOnce() {
  if (app.locals.dbConnected) {
    return
  }

  await connectDB()
  app.locals.dbConnected = true

  // Keep role normalization behavior consistent with server startup.
  if (!rolesNormalized) {
    await User.updateMany({ role: 'staff' }, { $set: { role: 'employee' } })
    rolesNormalized = true
  }
}

export default async function handler(req, res) {
  try {
    if (!app.locals.dbConnected) {
      if (!initPromise) {
        initPromise = initializeOnce().catch((error) => {
          initPromise = null
          throw error
        })
      }
      await initPromise
    }

    return app(req, res)
  } catch (error) {
    console.error('Vercel initialization failed:', error)
    return res.status(503).json({ message: 'Database is unavailable. Please try again later.' })
  }
}
