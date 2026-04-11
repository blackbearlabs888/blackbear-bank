import { useAuthStore } from '@/store/auth'

/**
 * Custom fetch wrapper that automatically includes authentication headers
 * This solves the issue where Zustand persist stores token in localStorage,
 * but API routes need access to the token via headers
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuthStore.getState().token
  
  const headers = new Headers(options.headers || {})
  
  // Add Content-Type if body is present and not already set
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Global 401 interceptor — auto-logout on expired session
  // Skip for auth endpoints to avoid infinite loop
  if (response.status === 401 && !url.includes('/api/auth/')) {
    console.warn('[apiFetch] 401 detected, logging out. URL:', url)
    // Use setTimeout to avoid blocking the current call stack
    // and let the caller handle the response first
    setTimeout(() => {
      useAuthStore.getState().logout()
    }, 100)
  }

  return response
}

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  get: (url: string) => apiFetch(url),
  
  post: (url: string, data?: unknown) => apiFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  put: (url: string, data?: unknown) => apiFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  patch: (url: string, data?: unknown) => apiFetch(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  delete: (url: string) => apiFetch(url, {
    method: 'DELETE',
  }),
}
