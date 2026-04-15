import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/db.js'
import { MONGODB_URI, PORT } from './config/env.js'
import { User } from './models/User.js'

app.locals.dbConnected = false

app.listen(PORT, () => {
  console.log(`Task API server running on http://localhost:${PORT}`)
})

try {
  await connectDB()
  app.locals.dbConnected = true
  await User.updateMany({ role: 'staff' }, { $set: { role: 'employee' } })
  console.log(`Connected MongoDB: ${MONGODB_URI}`)
} catch (error) {
  console.error('MongoDB connection failed:', error)
}
