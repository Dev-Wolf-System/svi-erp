import "server-only";
import IORedis, { type Redis as RedisClient } from "ioredis";

let _redis: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL no configurada");
  }
  _redis = new IORedis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    keyPrefix: "svi:",
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  // Silenciar errores no críticos — el fail-open en cacheGet/cacheSet maneja
  _redis.on("error", () => { /* swallow — cacheGet/cacheSet manejan */ });
  return _redis;
}

const TTL_24H_SECONDS = 60 * 60 * 24;
const TTL_7D_SECONDS  = TTL_24H_SECONDS * 7;
const TTL_4H_SECONDS  = 60 * 60 * 4;
const TTL_1H_SECONDS  = 60 * 60;

export const TTL = {
  insights:   TTL_24H_SECONDS,
  categorize: TTL_7D_SECONDS,
  forecast:   TTL_4H_SECONDS,
  anomalies:  TTL_1H_SECONDS,
} as const;

/** GET con tipado y deserialización JSON. Devuelve null si no existe. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null; // si Redis está caído, no rompemos la app — saltamos cache
  }
}

/** SET con TTL en segundos. Silenciosamente falla si Redis está caído. */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

/** Invalida una clave. */
export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch {
    /* ignore */
  }
}

/** Construye una clave de cache estandarizada. */
export function makeCacheKey(parts: (string | number)[]): string {
  return parts.map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, "_")).join(":");
}
