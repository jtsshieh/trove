import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';

import { PrismaClient } from '@/generated/prisma/client';

const prismaClientSingleton = () => {
	const adapter = new PrismaPg(process.env.DATABASE_URL!);
	return new PrismaClient({ adapter });
};

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

const redisClientSingleton = () => {
	return new Redis(process.env.REDIS_URL!);
};

const redis = globalThis.redisGlobal ?? redisClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.redisGlobal = redis;

declare const globalThis: {
	prismaGlobal: ReturnType<typeof prismaClientSingleton>;
	redisGlobal: ReturnType<typeof redisClientSingleton>;
} & typeof global;

export { prisma, redis };
