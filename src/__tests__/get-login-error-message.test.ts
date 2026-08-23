import { describe, it, expect } from 'vitest';
import { getLoginErrorMessage, LOGIN_NETWORK_ERROR } from '@/lib/get-login-error-message';

describe('getLoginErrorMessage — 401 override (account enumeration prevention)', () => {
  const GENERIC_401 = 'Email atau password salah';

  // ── 401: ALL variants must return the same generic message ─────

  it('401 with "Tidak terautentikasi" → generic message', () => {
    const serverError = { code: 'UNAUTHENTICATED', message: 'Tidak terautentikasi', requestId: 'req_1' };
    expect(getLoginErrorMessage(401, { error: serverError })).toBe(GENERIC_401);
  });

  it('401 with "Invalid credentials" → generic message', () => {
    const serverError = { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', requestId: 'req_2' };
    expect(getLoginErrorMessage(401, { error: serverError })).toBe(GENERIC_401);
  });

  it('401 with raw {code,message,requestId} object → generic message', () => {
    const serverError = { code: 'AUTH_FAIL', message: 'Email tidak ditemukan', requestId: 'req_3' };
    expect(getLoginErrorMessage(401, { error: serverError })).toBe(GENERIC_401);
  });

  it('401 with null error body → generic message', () => {
    expect(getLoginErrorMessage(401, null)).toBe(GENERIC_401);
  });

  it('401 with undefined error body → generic message', () => {
    expect(getLoginErrorMessage(401, undefined)).toBe(GENERIC_401);
  });

  it('401 with empty object → generic message', () => {
    expect(getLoginErrorMessage(401, {})).toBe(GENERIC_401);
  });

  it('401 with string error → generic message', () => {
    expect(getLoginErrorMessage(401, 'Unauthorized')).toBe(GENERIC_401);
  });

  it('401 never leaks requestId', () => {
    const result = getLoginErrorMessage(401, { error: { code: 'X', message: 'Tidak terautentikasi', requestId: 'LEAK_THIS' } });
    expect(result).not.toContain('LEAK_THIS');
  });

  it('401 never leaks code', () => {
    const result = getLoginErrorMessage(401, { error: { code: 'LEAK_CODE', message: 'Nope' } });
    expect(result).not.toContain('LEAK_CODE');
  });

  it('wrong password and unknown email produce identical messages', () => {
    const wrongPw = { error: { code: 'WRONG_PASSWORD', message: 'Password salah' } };
    const noEmail = { error: { code: 'USER_NOT_FOUND', message: 'Email tidak ditemukan' } };
    expect(getLoginErrorMessage(401, wrongPw)).toBe(getLoginErrorMessage(401, noEmail));
  });

  // ── 429: rate limit ────────────────────────────────────────────

  it('429 → rate-limit message', () => {
    expect(getLoginErrorMessage(429, { error: { message: 'Too many requests' } }))
      .toBe('Terlalu banyak percobaan login. Silakan coba lagi nanti');
  });

  // ── 500/503: server error ──────────────────────────────────────

  it('500 → server problem message', () => {
    expect(getLoginErrorMessage(500, { error: { message: 'Internal Server Error' } }))
      .toBe('Layanan login sedang bermasalah. Silakan coba lagi');
  });

  it('503 → server problem message', () => {
    expect(getLoginErrorMessage(503, { error: { message: 'Service Unavailable' } }))
      .toBe('Layanan login sedang bermasalah. Silakan coba lagi');
  });

  // ── Other statuses: delegate to getErrorMessage ─────────────────

  it('400 → uses getErrorMessage with fallback', () => {
    expect(getLoginErrorMessage(400, { error: { message: 'Email wajib diisi' } }))
      .toBe('Email wajib diisi');
  });

  it('403 → uses getErrorMessage with fallback', () => {
    expect(getLoginErrorMessage(403, { error: { message: 'Akses ditolak' } }))
      .toBe('Akses ditolak');
  });

  it('unknown status with no message → generic fallback', () => {
    expect(getLoginErrorMessage(418, null))
      .toBe('Login gagal. Silakan coba lagi');
  });

  // ── Network error constant ─────────────────────────────────────

  it('LOGIN_NETWORK_ERROR is a non-empty string', () => {
    expect(typeof LOGIN_NETWORK_ERROR).toBe('string');
    expect(LOGIN_NETWORK_ERROR.length).toBeGreaterThan(0);
  });

  it('LOGIN_NETWORK_ERROR does not contain [object Object]', () => {
    expect(LOGIN_NETWORK_ERROR).not.toContain('[object Object]');
  });

  // ── React #31 safety: output is always a plain string ──────────

  it('always returns a string for any input', () => {
    const inputs = [
      [401, { error: { code: 'A', message: 'B', requestId: 'C' } }],
      [401, null],
      [401, undefined],
      [429, 'string error'],
      [500, { error: { code: 'X', message: 'Y', requestId: 'Z' } }],
      [503, undefined],
      [400, [1, 2, 3]],
      [404, { foo: 42 }],
    ];
    for (const [status, error] of inputs) {
      const result = getLoginErrorMessage(status as number, error);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('[object Object]');
    }
  });
});
