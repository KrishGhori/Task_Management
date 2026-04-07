export const PORT = Number(process.env.PORT ?? 4000)
export const JWT_SECRET = process.env.JWT_SECRET ?? 'task-management-dev-secret'
export const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/task_management_web'
export const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)
export const OTP_EXPIRES_MS = Number(process.env.OTP_EXPIRES_MS ?? 5 * 60 * 1000)

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
  : []
