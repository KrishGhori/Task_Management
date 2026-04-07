import { Router } from 'express'
import { listUsers, updateUserRole } from '../controllers/usersController.js'
import { authRequired } from '../middlewares/authRequired.js'

const router = Router()

router.get('/', authRequired, listUsers)
router.put('/:id/role', authRequired, updateUserRole)

export default router
