import { Router } from 'express'
import {
  createTask,
  deleteCompletedTasks,
  deleteTask,
  listTasks,
  updateTask,
} from '../controllers/tasksController.js'
import { authRequired } from '../middlewares/authRequired.js'

const router = Router()

router.use(authRequired)
router.get('/', listTasks)
router.post('/', createTask)
router.put('/:id', updateTask)
router.delete('/:id', deleteTask)
router.delete('/completed', deleteCompletedTasks)

export default router
