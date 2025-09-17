import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { ensureRedis, redis } from '../config/Ioredis'

const ISS = env.JWT_ISSUER
const AUD = env.JWT_AUDIENCE

function ttlToSec(ttl: string): number {
  // Accept "300", "15m", "24h", "30d"
  if (/^\d+$/.test(ttl)) return Number(ttl)
  const m = ttl.match(/^(\d+)([smhd])$/)
  if (!m) return 3600 // default 1 hour
  const n = Number(m[1])
  const u = m[2]
  return u === 's' ? n : u === 'm' ? n * 60 : u === 'h' ? n * 3600 : n * 86400
}

// ---------- Email verification ----------
export async function createEmailVerifyToken(userId: string) {
  await ensureRedis()
  const jti = randomUUID()
  const token = jwt.sign({ sub: userId, typ: 'email-verify', jti }, env.JWT_ACCESS_SECRET, {
    issuer: ISS,
    audience: AUD,
    expiresIn: ttlToSec(env.EMAIL_VERIFY_TTL) || ttlToSec('24h')
  })
  await redis.set(`ev:${jti}`, userId, 'EX', ttlToSec(env.EMAIL_VERIFY_TTL || '24h'))
  return token
}

export async function consumeEmailVerifyToken(token: string) {
  await ensureRedis()
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISS, audience: AUD }) as any
  if (payload.typ !== 'email-verify' || !payload.jti) throw new Error('Invalid token')
  const key = `ev:${payload.jti}`
  const userId = await redis.get(key)
  if (!userId) throw new Error('Token not found or expired')
  await redis.del(key)
  return userId
}

// ---------- Reset password ----------
export async function createResetPwdToken(userId: string) {
  await ensureRedis()
  const jti = randomUUID()
  const token = jwt.sign({ sub: userId, typ: 'reset-pwd', jti }, env.JWT_ACCESS_SECRET, {
    issuer: ISS,
    audience: AUD,
    expiresIn: ttlToSec(env.RESET_PWD_TTL) || ttlToSec('1h')
  })
  await redis.set(`rp:${jti}`, userId, 'EX', ttlToSec(env.RESET_PWD_TTL) || ttlToSec('1h'))
  return token
}

export async function consumeResetPwdToken(token: string) {
  await ensureRedis()
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISS, audience: AUD }) as any
  if (payload.typ !== 'reset-pwd' || !payload.jti) throw new Error('Invalid token')
  const key = `rp:${payload.jti}`
  const userId = await redis.get(key)
  if (!userId) throw new Error('Token expired or already used')
  await redis.del(key)
  return userId
}

// ---------- Refresh sessions (rotation) ----------
export async function createRefreshSession(userId: string) {
  await ensureRedis()
  const sid = randomUUID()
  await redis.set(`rt:${sid}`, userId, 'EX', ttlToSec(env.JWT_REFRESH_TTL) || ttlToSec('30d'))
  return sid
}

export async function rotateRefreshSession(oldSid: string, userId: string) {
  await ensureRedis()
  const oldKey = `rt:${oldSid}`
  const stored = await redis.get(oldKey)
  if (!stored || stored !== userId) throw new Error('Invalid session')
  await redis.del(oldKey)
  const newSid = await createRefreshSession(userId)
  return newSid
}

export async function revokeRefreshSession(sid: string) {
  await ensureRedis()
  await redis.del(`rt:${sid}`)
}

// Vérifie que la session de rafraîchissement est valide pour cet utilisateur
export async function assertRefreshSession(sid: string, userId: string) {
  await ensureRedis()
  const stored = await redis.get(`rt:${sid}`)
  if (!stored || stored !== userId) throw new Error('Invalid session')
}
