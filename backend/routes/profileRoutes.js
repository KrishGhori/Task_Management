import { Router } from 'express'
import {
  createMyProfile,
  getMyProfile,
  updateMyProfile,
} from '../controllers/profileController.js'
import { authRequired } from '../middlewares/authRequired.js'

const router = Router()

router.use(authRequired)
router.get('/me', getMyProfile)
router.post('/me', createMyProfile)
router.put('/me', updateMyProfile)

export default router
