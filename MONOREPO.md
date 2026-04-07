# Task Management App - Monorepo Structure

This project is organized as a monorepo with separate backend and frontend applications.

## Folder Structure

```
Task_managment_web/
├── backend/                    # Node.js/Express API server
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Backend environment variables
│   └── .env.example           # Backend env template
├── frontend/                   # React/Vite web application
│   ├── src/                   # React source code
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── assets/
│   ├── public/                # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json           # Frontend dependencies
├── public/                    # Root public assets (served by backend)
├── package.json               # Root package.json (monorepo management)
└── README.md
```

## Setup Instructions

### Install Dependencies

Install all dependencies for both backend and frontend:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

Or use the convenience script:

```bash
npm run install:all
```

## Development

### Run Both Frontend & Backend

```bash
npm run dev
```

This runs frontend on `http://localhost:5173` and backend on `http://localhost:4000`

### Run Frontend Only

```bash
npm run dev:frontend
```

Runs on `http://localhost:5173`

### Run Backend Only

```bash
npm run dev:backend
```

Runs on `http://localhost:4000`

## Backend (.env Configuration)

The backend requires environment variables. Copy `.env.example` to `.env` and configure:

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/task_management_web
JWT_SECRET=your-secret-key
ADMIN_EMAILS=admin@example.com
OTP_EXPIRES_MS=300000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com
```

## Building for Production

```bash
npm run build
```

This builds the frontend React app.

## Project Structure Benefits

- **Separation of Concerns**: Backend and frontend are independent, each with their own dependencies
- **Scalability**: Easy to add more services or applications
- **Deployment**: Can deploy backend and frontend separately or together
- **Testing**: Each application can be tested independently
- **Development**: Team members can focus on frontend or backend without dependencies
