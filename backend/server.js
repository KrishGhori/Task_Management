import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/db.js'
import { MONGODB_URI, PORT } from './config/env.js'
import { User } from './models/User.js'

await connectDB()
await User.updateMany({ role: 'staff' }, { $set: { role: 'employee' } })

app.listen(PORT, () => {
  console.log(`Task API server running on http://localhost:${PORT}`)
  console.log(`Connected MongoDB: ${MONGODB_URI}`)
})
