# Task Management Web

Full-stack task manager built with React + Vite (frontend) and Express + MongoDB (backend).

## Features

- ✅ Register/login with JWT authentication
- ✅ Tasks isolated per user account
- ✅ Create tasks with title, due date, and priority
- ✅ Edit existing tasks
- ✅ Mark tasks complete/incomplete/in-progress
- ✅ Advanced filtering and search
- ✅ Task assignment to other users
- ✅ In-app notifications (overdue, due-soon, assigned-to-you)
- ✅ Delete individual tasks or clear completed tasks
- ✅ Responsive design (laptop, tablet, phone)
- ✅ Smooth animations throughout
- ✅ MongoDB persistence for cross-device sync

## Tech Stack

- **Frontend**: React 19, Vite, JavaScript/JSX
- **Backend API**: Node.js, Express
- **Database**: MongoDB
- **Auth**: JWT tokens + bcrypt
- **Styling**: CSS3 with animations

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run frontend + backend together:

```bash
npm run dev:full
```

Or separately:

```bash
npm run dev        # Frontend on http://localhost:5173
npm run dev:server # Backend API on http://localhost:4000
```

### Production Build

```bash
npm run build
```

## Configuration

### Backend Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# Server
PORT=4000
JWT_SECRET=your-secret-key

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/task_management_web

# CORS (comma-separated list of allowed frontend URLs)
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
```

### Frontend Environment Variables

```bash
# Use custom API endpoint (optional)
VITE_API_URL=https://api.yourdomain.com
```

In development, defaults to `http://localhost:4000`. In production, set `VITE_API_URL` to your backend origin; the client appends `/api` automatically.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - List user's tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task (owner can edit all, assignee can update status)
- `DELETE /api/tasks/:id` - Delete task (owner only)
- `DELETE /api/tasks/completed` - Clear completed tasks

### Users
- `GET /api/users` - List all users (for assignment)

All protected routes require: `Authorization: Bearer <token>`

## Database Schema

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  passwordHash: String (bcrypt),
  createdAt: Date
}
```

### Task
```javascript
{
  userId: ObjectId (ref: User, owner),
  assigneeId: ObjectId (ref: User, optional),
  title: String (required),
  status: String (pending|in_progress|completed),
  dueDate: Date (optional),
  priority: String (low|medium|high),
  createdAt: Date,
  updatedAt: Date
}
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive guide covering:
- Single server deployment
- Separate frontend/backend deployment
- Docker deployment
- Troubleshooting
- Security checklist

## Scripts

```bash
npm run dev        - Start Vite dev server
npm run dev:server - Start Express backend
npm run dev:full   - Start both concurrently
npm run build      - Production build
npm run lint       - Run ESLint
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Open source
