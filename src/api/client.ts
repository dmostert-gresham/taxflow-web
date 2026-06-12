import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Long-timeout instance for Playwright operations (ITAS pre-fill can take 2+ minutes)
export const apiLong = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 180_000,
})

apiLong.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const formatNAD = (amount: number): string => {
  const abs = Math.abs(amount)
  return `N$${abs.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'object' && data?.message) return data.message
    if (typeof data === 'string') return data
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}
