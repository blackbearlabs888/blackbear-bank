/**
 * Input Sanitization & Validation Utility
 * Prevents XSS, injection attacks, and malformed input
 */

/**
 * Sanitize string - strip HTML tags, trim, normalize whitespace
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove common XSS patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remove control characters (except newline, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize name - allows letters, spaces, hyphens, apostrophes, dots
 */
export function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  const sanitized = sanitizeString(name);
  // Only allow letters (including unicode), spaces, hyphens, apostrophes, dots
  return sanitized.replace(/[^a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\-'.]/g, '');
}

/**
 * Sanitize phone - only digits and optional leading +
 */
export function sanitizePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Sanitize bank account number - only digits
 */
export function sanitizeBankAccount(account: unknown): string {
  if (typeof account !== 'string') return '';
  return account.replace(/[^\d]/g, '');
}

/**
 * Sanitize email - lowercase, trim
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validate field length
 */
export function validateLength(value: string, min: number, max: number): { valid: boolean; error?: string } {
  if (value.length < min) {
    return { valid: false, error: `Minimal ${min} karakter` };
  }
  if (value.length > max) {
    return { valid: false, error: `Maksimal ${max} karakter` };
  }
  return { valid: true };
}

/**
 * Validate nominal (must be positive number within range)
 */
export function validateNominal(value: unknown): { valid: boolean; value?: number; error?: string } {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: 'Nominal harus berupa angka' };
  }
  
  if (num < 10000) {
    return { valid: false, error: 'Minimal nominal Rp 10.000' };
  }
  
  if (num > 100000000) {
    return { valid: false, error: 'Maksimal nominal Rp 100.000.000' };
  }
  
  // Check for decimals
  if (num % 1 !== 0) {
    return { valid: false, error: 'Nominal harus bilangan bulat' };
  }
  
  return { valid: true, value: Math.floor(num) };
}

/**
 * Validate CUID format (Prisma default @id)
 * CUID: starts with lowercase letter, 25 chars, lowercase alphanumeric
 */
export function isValidCuid(value: string): boolean {
  const cuidRegex = /^[a-z][a-z0-9]{24}$/;
  return cuidRegex.test(value);
}

/**
 * Validate Indonesian phone number
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = sanitizePhone(phone);
  return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(cleaned);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Check for honeypot field (anti-bot)
 * If this field has any value, it's likely a bot
 */
export function isHoneypotTriggered(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  const str = String(value).trim();
  return str.length > 0;
}

/**
 * Sanitize city name - allows letters, spaces, parentheses, hyphens, dots
 */
export function sanitizeCity(city: unknown): string {
  if (typeof city !== 'string') return '';
  const sanitized = sanitizeString(city);
  return sanitized.replace(/[^a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\-().]/g, '');
}

/**
 * Validate method transaction (must be specific values)
 */
export function isValidMethodTransaction(value: string): boolean {
  return ['Online', 'COD'].includes(value);
}

/**
 * Deep sanitize an object's string fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToSanitize: Record<string, (val: unknown) => string>
): Partial<T> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key in fieldsToSanitize) {
      result[key] = fieldsToSanitize[key](value);
    } else if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }
  
  return result as Partial<T>;
}

// Field length limits
export const FIELD_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 100,
  EMAIL_MAX: 255,
  PHONE_MIN: 10,
  PHONE_MAX: 15,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  BANK_NAME_MAX: 50,
  BANK_ACCOUNT_MIN: 5,
  BANK_ACCOUNT_MAX: 20,
  BANK_HOLDER_MAX: 100,
  CITY_MAX: 100,
  NOMINAL_MIN: 10000,
  NOMINAL_MAX: 100000000,
} as const;
