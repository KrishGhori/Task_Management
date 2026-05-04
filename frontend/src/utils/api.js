export const TOKEN_KEY = 'task-management.auth.token'

const normalizeApiBaseUrl = (value) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

export const getApiUrl = () => {
  if (import.meta.env.DEV) {
    return '/api'
  }

  if (import.meta.env.VITE_API_URL) {
    return `${normalizeApiBaseUrl(import.meta.env.VITE_API_URL)}/api`
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`
  }

  return '/api'
}

export const API_URL = getApiUrl()

const toNetworkError = (error) => {
  if (error instanceof TypeError) {
    const message =
      import.meta.env.DEV
        ? 'Cannot reach the API. Make sure the backend is running on http://localhost:5000 and try again.'
        : 'Cannot reach the API. Check VITE_API_URL and backend availability.'
    return new Error(message)
  }

  return error instanceof Error ? error : new Error('Network request failed.')
}

export const fetchJson = async (url, init) => {
  try {
    return await fetch(url, init)
  } catch (error) {
    throw toNetworkError(error)
  }
}

export const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''
  const bodyText = await response.text()

  if (!bodyText) {
    return null
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      `Server returned non-JSON response from ${response.url || 'the API'}. Set VITE_API_URL to your deployed backend URL.`,
    )
  }

  try {
    return JSON.parse(bodyText)
  } catch {
    throw new Error('Server returned invalid JSON response.')
  }
}

export const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(TOKEN_KEY)
}