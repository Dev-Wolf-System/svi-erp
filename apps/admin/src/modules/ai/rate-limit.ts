import "server-only";
import { randomBytes } from "node:crypto";
import { getRedis } from "./cache";

interface WindowConfig {
  max:        number;  // requests máximos
  windowMs:   number;  // ventana en ms
}

function configFor(endpoint: string): WindowConfig {
  if (endpoint === "chat") {
    // Chat más permisivo: 30 mensajes / 5 min
    return { max: 30, windowMs: 5 * 60 * 1000 };
  }
  const hourly = Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 100);
  return { max: hourly, windowMs: 60 * 60 * 1000 };
}

export interface RateLimitResult {
  ok:        boolean;
  remaining: number;
  resetAt:   number; // ms timestamp
}

/**
 * Sliding window rate limiter usando Redis ZSET.
 *
 * Algoritmo:
 *   1. Remover entradas más viejas que (now - windowMs)
 *   2. Contar entradas restantes
 *   3. Si count < max, agregar entrada nueva con score=now
 *   4. Setear EXPIRE para limpieza automática si el usuario deja de venir
 *
 * Atomicidad garantizada por pipeline (los pasos van en orden, sin race
 * condition crítica para nuestro caso — pequeña inexactitud aceptable).
 *
 * Fail-open: si Redis está caído, devolvemos { ok: true } — preferimos
 * dejar pasar requests que romper la app por un cache caído.
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
): Promise<RateLimitResult> {
  const cfg = configFor(endpoint);
  const now = Date.now();
  const cutoff = now - cfg.windowMs;
  const key = `ai_rl:${endpoint}:${userId}`;
  const member = `${now}-${randomBytes(4).toString("hex")}`;

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, cutoff);
    pipeline.zcard(key);
    pipeline.zadd(key, now, member);
    pipeline.pexpire(key, cfg.windowMs + 1000);
    const results = await pipeline.exec();

    if (!results) {
      return { ok: true, remaining: cfg.max, resetAt: now + cfg.windowMs };
    }

    // results[1] = [error, count] tras zcard (count ANTES del zadd actual)
    const countBefore = Number(results[1]?.[1] ?? 0);
    const usedAfter = countBefore + 1;

    if (usedAfter > cfg.max) {
      // Excede — quitar la entrada que acabamos de agregar
      await redis.zrem(key, member);
      // resetAt = score más antiguo + windowMs
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const oldestScore = oldest?.[1] ? Number(oldest[1]) : now;
      return {
        ok:        false,
        remaining: 0,
        resetAt:   oldestScore + cfg.windowMs,
      };
    }

    return {
      ok:        true,
      remaining: Math.max(0, cfg.max - usedAfter),
      resetAt:   now + cfg.windowMs,
    };
  } catch {
    // fail-open: no bloqueamos si Redis cayó
    return { ok: true, remaining: cfg.max, resetAt: now + cfg.windowMs };
  }
}
