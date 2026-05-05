import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB } from './config/db.js'
import { User } from './models/User.js'
import { Profile } from './models/Profile.js'

const adminEmail = 'admin@example.com'
const adminPassword = 'admin123'

try {
  await connectDB()
  console.log('Connected to MongoDB')

  // Check if admin already exists
  const existing = await User.findOne({ email: adminEmail })
  if (existing) {
    console.log('Admin user already exists')
    process.exit(0)
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  const admin = await User.create({
    name: 'Admin',
    email: adminEmail,
    passwordHash,
    role: 'admin',
  })

  // Create profile for admin
  await Profile.create({
    userId: admin._id,
    displayName: 'Admin',
  })

  console.log('admin Admin user created successfully!')
  console.log(`Email: ${adminEmail}`)
  console.log(`Password: ${adminPassword}`)
  process.exit(0)
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
