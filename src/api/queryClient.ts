import { QueryClient } from '@tanstack/react-query'

/**
 * App-wide React Query client. Lives in its own module (rather than inline in
 * main.tsx) so non-React code — notably the auth store — can import it and clear
 * the cache on logout / account switch. Without that, a new user signing in
 * reuses the previous user's cached query data until a hard refresh.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})
