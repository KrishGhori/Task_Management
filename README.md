<<<<<<< HEAD
# Task Management Web

Full-stack task manager built with React + Vite (frontend) and Express + MongoDB (backend).

## Features

- Register/login with JWT authentication
- Tasks are isolated per user account
- Create tasks with title, due date, and priority
- Edit existing tasks
- Mark tasks complete/incomplete
- Filter by all, active, and completed
- Delete individual tasks or clear completed tasks
- Persist tasks in MongoDB for cross-device sync when using the same backend

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend API: Node.js, Express
- Database: MongoDB

## Run Locally

Install dependencies:

```bash
npm install
```

Run frontend + backend together:

```bash
npm run dev:full
```

Or run them separately:

```bash
npm run dev
npm run dev:server
```

Frontend: http://localhost:5173 (or next free Vite port)

Backend API: http://localhost:4000

## MongoDB Configuration

Set `MONGODB_URI` for the backend (optional). If not provided, default is:

`mongodb://127.0.0.1:27017/task_management_web`

PowerShell example:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/task_management_web"
npm run dev:server
```

## API Endpoints

- GET `/api/health`
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- GET `/api/tasks`
- POST `/api/tasks`
- PUT `/api/tasks/:id`
- DELETE `/api/tasks/:id`
- DELETE `/api/tasks/completed`

Protected routes require an `Authorization: Bearer <token>` header.

## Build

```bash
npm run build
```
=======
# Task_managment
>>>>>>> c946724752b4b22e14e3cbcfb0d83cb42eb4f136
