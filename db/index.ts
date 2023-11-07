import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const db =
  globalThis.prisma ||
  new PrismaClient({
    // log: ['query', 'info', 'warn', 'error']
  })

// db.$on('query', e => {
//   console.log('Query: ' + e.query)
//   console.log('Params: ' + e.params)
//   console.log('Duration: ' + e.duration + 'ms')
// })
if (process.env.NODE_ENV !== 'production') globalThis.prisma = db
