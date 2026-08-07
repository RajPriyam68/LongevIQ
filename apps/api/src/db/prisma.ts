import { PrismaClient, type Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isDev = process.env.NODE_ENV === 'development';

const logConfig: Prisma.LogDefinition[] = isDev
  ? [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
    ]
  : [{ emit: 'event', level: 'error' }];

const freshClient = new PrismaClient({ log: logConfig });

export const prisma = (globalForPrisma.prisma as typeof freshClient) ?? freshClient;

if (isDev) {
  globalForPrisma.prisma = prisma;
}

prisma.$on('error', (event) => {
  logger.error({ target: event.target }, event.message || 'Prisma error');
});

if (isDev) {
  prisma.$on('query', (event) => {
    logger.debug({ durationMs: event.duration }, event.query);
  });
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
