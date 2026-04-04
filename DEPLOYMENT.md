# Deployment Guide

This guide covers deploying your Task Management Web app to production.

## Architecture

- **Frontend**: React + Vite (static files)
- **Backend**: Node.js + Express API
- **Database**: MongoDB

You can deploy them together or separately depending on your hosting platform.

## Prerequisites

- Node.js 18+ installed
- MongoDB database (local or cloud service like MongoDB Atlas)
- Environment configuration

## Environment Setup

1. Create a `.env` file in the root directory (based on `.env.example`):

```bash
# Backend Server Configuration
PORT=4000
JWT_SECRET=your-production-secret-key-change-this

# MongoDB Connection
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/task_management_web

# CORS Configuration (comma-separated list of allowed origins)
# Your deployed frontend URL(s)
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com,https://*.vercel.app
```

## Deployment Option 1: Same Server (Recommended for Simple Setup)

### 1. Build the frontend

```bash
npm run build
```

This creates optimized static files in `dist/`.

### 2. Configure backend to serve frontend

The backend can serve the built frontend as static files. Ensure your backend includes:

```javascript
// Serve static files from dist (built frontend)
app.use(express.static('dist'))

// API routes first
app.use('/api', apiRoutes)

// Fallback: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})
```

### 3. Start the server

```bash
# Set environment variables
export PORT=3000
export MONGODB_URI=your_mongodb_url
export ALLOWED_ORIGINS=https://yourdomain.com
export JWT_SECRET=your_secret

# Start the server
node server/server.js
```

Access the app at: `https://yourdomain.com`

## Deployment Option 2: Separate Deployment

### Frontend (Vercel, Netlify, etc.)

1. Build: `npm run build`
2. Deploy the `dist/` folder
3. Set environment variable in your hosting:
   ```
   VITE_API_URL=https://api.yourdomain.com
   ```

### Backend (Heroku, Railway, Render, DigitalOcean, etc.)

Deploy the entire app directory and set environment variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `ALLOWED_ORIGINS` (your deployed frontend URL)
- `PORT` (optional, defaults to 4000)

Example for Railway:
```bash
PORT=3000
MONGODB_URI=mongodb+srv://...
ALLOWED_ORIGINS=https://yourfrontend.vercel.app
JWT_SECRET=your-secret
```

## Deployment Option 3: Docker

If you want to containerize both frontend and backend:

```dockerfile
FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server/server.js"]
```

Build and push:
```bash
docker build -t task-management .
docker push your-registry/task-management
```

## Troubleshooting Deployment Issues

### "Failed to fetch" / CORS errors

**Problem**: Frontend can't reach the backend API.

**Solutions**:
1. Verify `ALLOWED_ORIGINS` env var includes your frontend domain
2. Check backend is running and accessible from frontend domain
3. Use browser DevTools Network tab to see the blocked request
4. Verify API URL in frontend matches your backend deployment

### "Cannot GET /" error

Backend isn't serving the frontend files.

**Solution**:
- Ensure backend includes `app.use(express.static('dist'))`
- Verify `npm run build` was executed
- Check that `dist/` folder exists and contains index.html

### MongoDB Connection Errors

**Problem**: Backend can't connect to MongoDB.

**Solution**:
1. Verify `MONGODB_URI` is correct and accessible from your server
2. If using MongoDB Atlas, add server IP to IP whitelist
3. Check MongoDB network access settings

### Static Files Not Loading (CSS, JS)

**Problem**: CSS/JS files return 404 in production.

**Solution**:
- Ensure Vite built the app with correct base path
- Check dist/ folder has all assets
- Server must be configured to serve static files

## Scaling Tips

- Use a CDN (Cloudflare, AWS CloudFront) to cache frontend assets
- Use MongoDB Atlas for managed database (includes backups)
- Consider API caching for frequently accessed tasks
- Monitor backend performance and scale horizontally

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use HTTPS (redirect HTTP to HTTPS)
- [ ] Set `ALLOWED_ORIGINS` to your domain only
- [ ] Enable MongoDB authentication
- [ ] Use strong database passwords
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Set proper CORS headers
- [ ] Validate all API inputs
