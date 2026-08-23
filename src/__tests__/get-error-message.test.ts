import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '@/lib/get-error-message';

describe('getErrorMessage', () => {
  const fallback = 'Terjadi kesalahan. Silakan coba lagi.';

  // ── 1. String input ─────────────────────────────────────────────
  it('returns a plain string as-is', () => {
    expect(getErrorMessage('Something went wrong')).toBe('Something went wrong');
  });

  it('trims whitespace from string input', () => {
    expect(getErrorMessage('  hello  ')).toBe('hello');
  });

  it('returns fallback for empty/whitespace-only string', () => {
    expect(getErrorMessage('')).toBe(fallback);
    expect(getErrorMessage('   ')).toBe(fallback);
  });

  // ── 2. Native Error ─────────────────────────────────────────────
  it('extracts .message from native Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('extracts .message from TypeError', () => {
    expect(getErrorMessage(new TypeError('not a function'))).toBe('not a function');
  });

  it('returns fallback for Error with empty message', () => {
    expect(getErrorMessage(new Error(''))).toBe(fallback);
  });

  // ── 3. { message: "..." } ───────────────────────────────────────
  it('extracts .message from a plain object', () => {
    expect(getErrorMessage({ message: 'Not found' })).toBe('Not found');
  });

  // ── 4. { error: "..." } (legacy string error) ───────────────────
  it('extracts .error when it is a string', () => {
    expect(getErrorMessage({ error: 'Unauthorized' })).toBe('Unauthorized');
  });

  // ── 5. { error: { code, message, requestId } } (API shape) ─────
  it('extracts nested .error.message from API error shape', () => {
    const apiErr = {
      code: 'TX_NOT_FOUND',
      message: 'Transaksi tidak ditemukan',
      requestId: 'req_abc123',
    };
    expect(getErrorMessage({ error: apiErr })).toBe('Transaksi tidak ditemukan');
  });

  // ── 6. Nested error ──────────────────────────────────────────────
  it('handles deeply nested error objects', () => {
    const nested = {
      error: {
        error: {
          message: 'Deep error',
          code: 'DEEP',
          requestId: 'r1',
        },
      },
    };
    expect(getErrorMessage(nested)).toBe('Deep error');
  });

  // ── 7. null / undefined ──────────────────────────────────────────
  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe(fallback);
  });

  it('returns fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe(fallback);
  });

  // ── 8. Array / object without message ───────────────────────────
  it('returns fallback for an array', () => {
    expect(getErrorMessage([1, 2, 3])).toBe(fallback);
  });

  it('returns fallback for an object without message/error', () => {
    expect(getErrorMessage({ foo: 42, bar: true })).toBe(fallback);
  });

  // ── 9. HTML / plain-text response ────────────────────────────────
  it('handles HTML string input', () => {
    const html = '<html><body>502 Bad Gateway</body></html>';
    expect(getErrorMessage(html)).toBe(html);
  });

  it('handles plain text response', () => {
    expect(getErrorMessage('Internal Server Error')).toBe('Internal Server Error');
  });

  // ── 10. Output is always string ─────────────────────────────────
  it('always returns a string', () => {
    expect(typeof getErrorMessage(null)).toBe('string');
    expect(typeof getErrorMessage(undefined)).toBe('string');
    expect(typeof getErrorMessage(42)).toBe('string');
    expect(typeof getErrorMessage(true)).toBe('string');
    expect(typeof getErrorMessage({})).toBe('string');
    expect(typeof getErrorMessage([])).toBe('string');
    expect(typeof getErrorMessage(new Error('x'))).toBe('string');
  });

  // ── 11. Sensitive keys never leak ────────────────────────────────
  it('never includes requestId in output', () => {
    const input = { requestId: 'req_secret_123' };
    const output = getErrorMessage(input);
    expect(output).not.toContain('req_secret_123');
  });

  it('never includes stack in output', () => {
    const input = { stack: 'Error at line 1\n  at foo' };
    const output = getErrorMessage(input);
    expect(output).not.toContain('line 1');
  });

  it('never includes password in output', () => {
    const input = { password: 's3cret!' };
    const output = getErrorMessage(input);
    expect(output).not.toContain('s3cret');
  });

  it('never includes token in output', () => {
    const input = { token: 'eyJhbGciOi...' };
    const output = getErrorMessage(input);
    expect(output).not.toContain('eyJhbGciOi');
  });

  it('never includes raw object JSON in output', () => {
    const input = { code: 'ERR_001', message: 'fail', requestId: 'r1' };
    const output = getErrorMessage(input);
    // The output should be 'fail' (the message), not the JSON string
    expect(output).toBe('fail');
    expect(output).not.toContain('ERR_001');
    expect(output).not.toContain('r1');
  });

  // ── 12. Custom fallback ─────────────────────────────────────────
  it('uses custom fallback when provided', () => {
    expect(getErrorMessage(null, 'Custom error')).toBe('Custom error');
    expect(getErrorMessage({}, 'Oops')).toBe('Oops');
  });

  // ── 13. .error_description (OAuth) ───────────────────────────────
  it('extracts .error_description', () => {
    const input = { error: 'invalid_grant', error_description: 'Token expired' };
    expect(getErrorMessage(input)).toBe('Token expired');
  });

  // ── 14. .data.error wrapper ─────────────────────────────────────
  it('extracts .data.error', () => {
    const input = { data: { error: { code: 'X', message: 'Inner fail' } } };
    expect(getErrorMessage(input)).toBe('Inner fail');
  });

  // ── 15. Number / boolean primitives ──────────────────────────────
  it('returns fallback for number', () => {
    expect(getErrorMessage(404)).toBe(fallback);
  });

  it('returns fallback for boolean', () => {
    expect(getErrorMessage(false)).toBe(fallback);
  });

  // ── 16. Empty response object ───────────────────────────────────
  it('handles empty parsed JSON body', () => {
    expect(getErrorMessage({})).toBe(fallback);
  });

  // ── 17. Source-level scan: no raw object can reach output ───────
  it('never returns [object Object]', () => {
    const inputs = [
      { code: 'A', message: 'B', requestId: 'C' },
      { error: { code: 'X', message: 'Y', requestId: 'Z' } },
      { data: { error: 'nested' } },
    ];
    for (const input of inputs) {
      const output = getErrorMessage(input);
      expect(output).not.toBe('[object Object]');
    }
  });
});
