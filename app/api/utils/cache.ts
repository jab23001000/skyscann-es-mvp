// app/api/utils/cache.ts
import { Redis } from "@upstash/redis";
import { hash } from "ohash"; // librería para generar hash único

// Redis: cogerá configuración desde variables de entorno en Vercel
const redis = Redis.fromEnv();

/**
 * Genera una clave única a partir de un objeto y un prefijo
 */
export function makeKey(prefix: string, obj: any) {
  return `${prefix}:${hash(obj)}`;
}

/**
 * Lee un valor del caché
 */
export async function CacheGet<T = any>(key: string): Promise<T | null> {
  try {
    return await redis.get(key) as T | null;
  } catch (err) {
    console.error("Error leyendo caché", key, err);
    return null;
  }
}

/**
 * Guarda un valor en el caché con TTL en segundos
 */
export async function CacheSet<T = any>(key: string, value: T, ttlSeconds = 3600) {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error("Error escribiendo caché", key, err);
  }
}
