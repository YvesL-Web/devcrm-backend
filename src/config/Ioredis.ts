import IORedis, { Redis, RedisOptions } from 'ioredis'
import { env } from './env'

// Déclare un singleton global pour éviter plusieurs connexions en dev (HMR / tests)
declare global {
  var __REDIS__: Redis | undefined
}

const REDIS_URL = env.REDIS_URL
if (!REDIS_URL) {
  throw new Error('REDIS_URL is not defined')
}

const options: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,

  // Network
  connectTimeout: 50_000, // 50s
  keepAlive: 5_000, // 5s
  noDelay: true, // désactive Nagle pour réduire la latence

  // Reconnection strategy
  retryStrategy(times) {
    const base = Math.min(1000 * Math.pow(2, Math.max(0, times - 1)), 30_000)
    const jitter = Math.floor(base * 0.25 * Math.random())
    return base + jitter
  },

  reconnectOnError(err) {
    if (err && err.message && /READONLY|ETIMEDOUT|ECONNRESET/i.test(err.message)) {
      return true
    }
    return false
  }
}

const client = globalThis.__REDIS__ || new IORedis(REDIS_URL, options)

if (env.NODE_ENV !== 'production') {
  globalThis.__REDIS__ = client
}

// Attach logs only once
function attachLogsOnce(r: Redis) {
  const key = Symbol.for('ioredis-logs-attached') // unique key to avoid multiple attachments
  const anyR = r as any
  if (anyR[key]) return
  anyR[key] = true

  r.on('connect', () => console.info('✅ [redis] connect'))
  r.on('ready', () => console.info('🟢 [redis] ready'))
  r.on('reconnecting', (delay: number) => console.warn(`🔄 [redis] reconnecting in ${delay}ms`))
  r.on('end', () => console.warn('🔚 [redis] end'))
  r.on('error', (err) => console.error(`❌ [redis] error: ${err?.message ?? err}`))
}

attachLogsOnce(client)

// ---- API ----

export const redis: Redis = client

/**
 * Vérifie/établit la connexion et valide avec un PING.
 * À appeler au démarrage des workers/serveurs si souhaité.
 */
export async function ensureRedis(): Promise<void> {
  // Si la connexion est fermée/terminée, on tente une reconnexion explicite
  if (redis.status === 'end' || redis.status === 'close') {
    await redis.connect()
  }
  // Si on n'est pas prêt, on attend la connexion
  if (redis.status === 'wait' || redis.status === 'connecting' || redis.status === 'connect') {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup()
        resolve()
      }
      const onError = (e: unknown) => {
        cleanup()
        reject(e)
      }
      const cleanup = () => {
        redis.off('ready', onReady)
        redis.off('error', onError as any)
      }
      redis.once('ready', onReady)
      redis.once('error', onError as any)
    })
  }
  // Valide la connexion
  await redis.ping()
}

/**
 * Arrêt propre : tente QUIT (grâce), puis DISCONNECT en fallback.
 * @param timeoutMs délai maximum pour QUIT avant fallback
 */
export async function closeRedis(timeoutMs = 2_000): Promise<void> {
  try {
    await Promise.race([
      redis.quit(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('QUIT timeout')), timeoutMs))
    ])
  } catch {
    // Si QUIT échoue (socket cassée, etc.), on coupe net
    redis.disconnect()
  }
}
