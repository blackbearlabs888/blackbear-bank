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
  
  return fetch(url, {
    ...options,
    headers,
  })
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
