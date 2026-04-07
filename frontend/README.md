# Frontend Setup

## Installation

```bash
cd frontend
npm install
```

## Development

Run the Vite dev server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## API Configuration

The frontend is configured to proxy API requests to the backend:
- All requests to `/api/*` are forwarded to `http://localhost:4000`
- This is configured in `vite.config.ts`

## Building for Production

```bash
npm run build
```

This generates an optimized build in the `dist/` folder.

## Linting

```bash
npm run lint
```

## Project Structure

- `src/` - React source code and components
- `public/` - Static assets served directly
- `assets/` - Image and other static files
- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration

## Connecting to Backend

The frontend automatically proxies API calls to the backend running on `http://localhost:4000`. Make sure the backend is running before starting the frontend.
