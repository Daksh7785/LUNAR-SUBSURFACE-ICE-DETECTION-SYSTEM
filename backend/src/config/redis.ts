import { createClient } from 'redis';
import { logger } from './logger';
import { env } from './env';

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis successfully');
});

export const cache = {
  connect: async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  },
  get: async (key: string): Promise<string | null> => {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      return await redisClient.get(key);
    } catch (err) {
      logger.error('Redis get error', { key, error: (err as Error).message });
      return null;
    }
  },
  set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
    } catch (err) {
      logger.error('Redis set error', { key, error: (err as Error).message });
    }
  },
  getOrCompute: async <T>(key: string, computeFn: () => Promise<T>, ttlSeconds: number): Promise<T> => {
    const cached = await cache.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (err) {
        logger.error('Error parsing cached JSON', { key, error: (err as Error).message });
      }
    }
    const result = await computeFn();
    await cache.set(key, JSON.stringify(result), ttlSeconds);
    return result;
  },
  client: redisClient,
};
