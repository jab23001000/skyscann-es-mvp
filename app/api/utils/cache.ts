// app/api/utils/cache.ts
import { Redis } from "@upstash/redis";
import { hash } from "ohash";

const redis = Redis.fromEnv();

/** Clave única a partir de un prefijo y cualquier payload */
export function makeKey(prefix: string, payload: unknown) {
  return `${prefix}:${hash(payload)}`;
}

/** Lee desde caché; null si no existe */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

/** Escribe en caché con TTL (por defecto 6h) */
export async function cacheSet<T = unknown>(key: string, value: T, ttlSec = 21600) {
  try {
    await redis.set(key, value as any, { ex: ttlSec });
  } catch {
    // no reventamos la request si el caché falla
  }
}
