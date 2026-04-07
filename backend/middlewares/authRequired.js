import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/env.js'
import { User } from '../models/User.js'

export const authRequired = async (req, res, next) => {
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
      role: user.role === 'admin' ? 'admin' : 'employee',
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}
