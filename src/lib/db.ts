import { PrismaClient, Decimal } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Convert Prisma Decimal to number safely
 * Handles Decimal objects, strings, and numbers
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (value instanceof Decimal) return value.toNumber()
  if (typeof value === 'string') return parseFloat(value) || 0
  return Number(value) || 0
}
