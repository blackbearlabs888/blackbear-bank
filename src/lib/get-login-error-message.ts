import { getErrorMessage } from '@/lib/get-error-message';

/**
 * Login-specific error message resolver.
 *
 * SECURITY: 401 responses ALWAYS return the generic "Email atau password salah"
 * regardless of the server's error body. This prevents account enumeration —
 * an attacker cannot distinguish "email not found" from "wrong password".
 *
 * Other HTTP statuses use context-specific hard-coded messages so the user
 * gets actionable feedback without leaking internal details.
 *
 * @param status  HTTP response status code
 * @param error   Parsed JSON error value from the API
 */
export function getLoginErrorMessage(status: number, error: unknown): string {
  if (status === 401) {
    return 'Email atau password salah';
  }

  if (status === 429) {
    return 'Terlalu banyak percobaan login. Silakan coba lagi nanti';
  }

  if (status === 500 || status === 503) {
    return 'Layanan login sedang bermasalah. Silakan coba lagi';
  }

  // Any other non-success status — let getErrorMessage extract what it can
  return getErrorMessage(error, 'Login gagal. Silakan coba lagi');
}

/** Network-level failure message (used in the catch block). */
export const LOGIN_NETWORK_ERROR = 'Koneksi bermasalah. Silakan coba lagi';
