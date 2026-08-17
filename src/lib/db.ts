import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Re-export toNumber from the browser-safe number-utils module so that
// existing server-side `import { toNumber } from '@/lib/db'` call sites
// continue to work unchanged. New browser-side code should import
// directly from '@/lib/number-utils' to avoid pulling @prisma/client
// into the client bundle.
export { toNumber } from '@/lib/number-utils'
