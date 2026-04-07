import { Router } from 'express'
import {
  me,
  register,
  requestOtp,
  updateMe,
  verifyOtp,
} from '../controllers/authController.js'
import { authRequired } from '../middlewares/authRequired.js'

const router = Router()

router.post('/register', register)
router.post('/login/request-otp', requestOtp)
router.post('/login/verify-otp', verifyOtp)
router.get('/me', authRequired, me)
router.put('/me', authRequired, updateMe)

export default router
