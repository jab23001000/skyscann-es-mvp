// app/api/utils/cache.ts
import { Redis } from "@upstash/redis";
import { hash } from "ohash";

const redis = Redis.fromEnv();

/** Construye una clave hashada y estable a partir de un payload */
export function makeKey(prefix: string, payload: unknown) {
  return `${prefix}:${hash(payload)}`;
}

/** Lee desde caché. Devuelve null si no existe o si hay error. */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  try { return await redis.get<T>(key); } catch { return null; }
}

/** Escribe en caché con TTL (por defecto 6h = 21600 s) */
export async function cacheSet<T = unknown>(key: string, value: T, ttlSec = 21600) {
  await redis.set(key, value as any, { ex: ttlSec });
}
