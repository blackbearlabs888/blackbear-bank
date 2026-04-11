import { useAuthStore } from '@/store/auth'

/**
 * Helper function to get auth headers
 */
export function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

/**
 * Authenticated fetch wrapper
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token
  
  const headers: HeadersInit = {
    ...options.headers,
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Authenticated GET request
 */
export async function authGet(url: string): Promise<Response> {
  return authFetch(url, { method: 'GET' })
}

/**
 * Authenticated POST request
 */
export async function authPost(url: string, data?: unknown): Promise<Response> {
  return authFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Authenticated PATCH request
 */
export async function authPatch(url: string, data?: unknown): Promise<Response> {
  return authFetch(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Authenticated DELETE request
 */
export async function authDelete(url: string): Promise<Response> {
  return authFetch(url, { method: 'DELETE' })
}
