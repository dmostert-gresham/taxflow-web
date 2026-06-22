import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const EVENTS = ['mousemove', 'keydown', 'click', 'touchstart'] as const

export function useInactivityTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, TIMEOUT_MS)
    }

    reset()
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [isAuthenticated, logout, navigate])
}
