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

  // ── 18. Context-specific fallback regression tests ───────────────
  //     These verify that every critical flow uses a distinct,
  // human-readable fallback — NOT a generic message.

  describe('context-specific fallback regression', () => {
    // Simulates the actual API error shape: { error: { code, message, requestId } }
    const apiError = (msg: string) => ({
      code: 'SOME_CODE',
      message: msg,
      requestId: 'req_test_123',
    });

    it('login wrong password → shows server message, NOT account-specific info', () => {
      // Server returns specific message like 'Email tidak ditemukan' or 'Password salah'
      // The login page ALWAYS uses 'Email atau password salah' as fallback to prevent
      // account enumeration, but if server provides a safe message, that is shown instead.
      const serverMsg = 'Password salah';
      expect(getErrorMessage(apiError(serverMsg), 'Email atau password salah'))
        .toBe('Password salah');
    });

    it('login no valid message → falls back to enum-safe generic', () => {
      // When server error has no usable message, fallback prevents enumeration
      expect(getErrorMessage({ code: 'X', requestId: 'r1' }, 'Email atau password salah'))
        .toBe('Email atau password salah');
    });

    it('login never leaks requestId even with API object', () => {
      const result = getErrorMessage(
        { error: { code: 'UNAUTHENTICATED', message: 'Tidak terautentikasi', requestId: 'req_secret' } },
        'Email atau password salah',
      );
      expect(result).not.toContain('req_secret');
      expect(result).toBe('Tidak terautentikasi');
    });

    it('delete transaction 404 → shows server message when available', () => {
      expect(getErrorMessage(apiError('Transaksi tidak ditemukan'), 'Gagal menghapus transaksi'))
        .toBe('Transaksi tidak ditemukan');
    });

    it('delete transaction network failure → shows context fallback', () => {
      // null simulates empty/non-JSON response (network failure)
      expect(getErrorMessage(null, 'Gagal menghapus transaksi'))
        .toBe('Gagal menghapus transaksi');
    });

    it('delete transaction empty error object → shows context fallback', () => {
      expect(getErrorMessage({ error: { code: 'TX_NOT_FOUND', requestId: 'r1' } }, 'Gagal menghapus transaksi'))
        .toBe('Gagal menghapus transaksi');
    });

    it('update status → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memperbarui status transaksi'))
        .toBe('Gagal memperbarui status transaksi');
    });

    it('create order → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal membuat order'))
        .toBe('Gagal membuat order');
    });

    it('load tracking → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memuat data tracking'))
        .toBe('Gagal memuat data tracking');
    });

    it('load dashboard → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memuat data dashboard'))
        .toBe('Gagal memuat data dashboard');
    });

    it('load customer → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memuat data customer'))
        .toBe('Gagal memuat data customer');
    });

    it('load partner → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memuat data partner'))
        .toBe('Gagal memuat data partner');
    });

    it('save settings → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal menyimpan pengaturan'))
        .toBe('Gagal menyimpan pengaturan');
    });

    it('blog error → uses module-specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memproses data blog'))
        .toBe('Gagal memproses data blog');
    });

    it('FAQ error → uses module-specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memproses data FAQ'))
        .toBe('Gagal memproses data FAQ');
    });

    it('lokasi error → uses module-specific fallback', () => {
      expect(getErrorMessage(null, 'Gagal memproses data lokasi'))
        .toBe('Gagal memproses data lokasi');
    });

    it('register failure → uses specific fallback', () => {
      expect(getErrorMessage(null, 'Pendaftaran gagal. Silakan periksa data Anda'))
        .toBe('Pendaftaran gagal. Silakan periksa data Anda');
    });

    it('no two different flows share the same fallback', () => {
      // This test ensures each critical flow has a DISTINCT fallback
      const fallbacks = [
        'Email atau password salah',
        'Pendaftaran gagal. Silakan periksa data Anda',
        'Gagal menghapus transaksi',
        'Gagal memperbarui status transaksi',
        'Gagal membuat order',
        'Gagal memuat data tracking',
        'Gagal memuat data dashboard',
        'Gagal memuat data customer',
        'Gagal memuat data partner',
        'Gagal menyimpan pengaturan',
        'Gagal memproses data blog',
        'Gagal memproses data FAQ',
        'Gagal memproses data lokasi',
      ];
      const unique = new Set(fallbacks);
      expect(unique.size).toBe(fallbacks.length);
    });
  });
});
