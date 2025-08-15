// app/api/utils/cache.ts
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();


export function makeKey(...parts: (string | number | object)[]) {
  return parts
    .map(p => typeof p === "object" ? JSON.stringify(p) : String(p))
    .join(":");
}

}

export async function cacheGet<T>(key: string): Promise<T | null> {
  return await redis.get<T>(key);
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 3600) {
  await redis.set(key, value, { ex: ttlSeconds });
}

