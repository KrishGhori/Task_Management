# Backend Setup

## Environment Variables

Create a `.env` file in the `backend/` folder with the following configuration:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/task_management_web
JWT_SECRET=your-secret-key-change-in-production
ADMIN_EMAILS=admin@example.com,superadmin@example.com
OTP_EXPIRES_MS=300000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@taskmgmt.com
```

## Installation

```bash
cd backend
npm install
```

## Running the Backend

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

The API will be available at `http://localhost:4000`

## API Endpoints

The backend provides the following API routes:
- **Authentication**: `/api/auth/*`
- **Tasks**: `/api/tasks/*`
- **Users**: `/api/users/*`

These are consumed by the frontend which proxies requests to `http://localhost:4000`
