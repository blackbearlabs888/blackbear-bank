import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<boolean> {
  const [salt, hash] = storedPassword.split(':');
  const computedHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return hash === computedHash;
}

// Session management
export async function createSession(userId: string): Promise<string> {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
    },
  });

  return sessionId;
}

export async function getSession(sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          partner: true,
        },
      },
    },
  });

  if (!session) return null;

  if (new Date() > session.expiresAt) {
    await db.session.delete({ where: { id: sessionId } });
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string) {
  try {
    await db.session.delete({ where: { id: sessionId } });
  } catch {
    // Session might not exist
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;

  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session) {
    // Clear invalid session cookie
    cookieStore.delete('sessionId');
    return null;
  }

  return session.user;
}

// Cookie helpers
export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('sessionId');
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^08[0-9]{8,12}$/;
  return phoneRegex.test(phone);
}

// Generate order ID
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `BB-${timestamp}-${random}`;
}

// Fee calculation
export function calculatePaymentFee(
  nominal: number,
  paymentType: {
    onlineFeePercent: number;
    onlineFeeFlat: number;
    codFeePercent: number;
    codFeeFlat: number;
    threshold: number;
  },
  method: 'Online' | 'COD'
): number {
  const feePercent = method === 'Online' ? paymentType.onlineFeePercent : paymentType.codFeePercent;
  const feeFlat = method === 'Online' ? paymentType.onlineFeeFlat : paymentType.codFeeFlat;

  if (nominal >= paymentType.threshold) {
    return nominal * (feePercent / 100);
  }
  return feeFlat;
}

// Calculate margin breakdown
export function calculateMarginBreakdown(
  paymentFee: number,
  platformFee: number,
  partnerRate: number
) {
  const netMargin = paymentFee - platformFee;
  const partnerProfit = netMargin * (partnerRate / 100);
  const ownerProfit = netMargin - partnerProfit;

  return {
    netMargin,
    partnerProfit,
    ownerProfit,
  };
}
