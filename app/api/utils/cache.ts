// app/api/utils/cache.ts
import { Redis } from "@upstash/redis";
import { hash } from "ohash"; // ahora sí con import correcto

const redis = Redis.fromEnv();

export function makeKey(prefix: string, obj: any) {
  return `${prefix}:${hash(obj)}`;
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    return await redis.get(key) as T | null;
  } catch {
    return null;
  }
}

export async function setCache<T = any>(key: string, value: T, ttlSeconds = 3600) {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    console.error("Error setting cache", key);
  }
}

