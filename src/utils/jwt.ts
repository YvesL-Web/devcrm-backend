import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

function ttlToSec(ttl: string): number {
  // Accept "300", "15m", "24h", "30d"
  if (/^\d+$/.test(ttl)) return Number(ttl)
  const m = ttl.match(/^(\d+)([smhd])$/)
  if (!m) return 3600 // default 1 hour
  const n = Number(m[1])
  const u = m[2]
  return u === 's' ? n : u === 'm' ? n * 60 : u === 'h' ? n * 3600 : n * 86400
}

const ISS = env.JWT_ISSUER || 'devcrm'
const AUD = env.JWT_AUDIENCE || 'devcrm-app'

const ACCESS_SECRET = env.JWT_ACCESS_SECRET || 'insecure_access'
const REFRESH_SECRET = env.JWT_REFRESH_SECRET || 'insecure_refresh'

export type AccessClaims = { sub: string; typ: 'access'; orgId?: string }
export type RefreshClaims = { sub: string; typ: 'refresh'; sid: string }

export function signAccess(userId: string, orgId?: string, ttl = env.JWT_ACCESS_TTL || '45m') {
  const payload: AccessClaims = { sub: userId, typ: 'access', orgId }
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ttlToSec(ttl),
    issuer: ISS,
    audience: AUD,
    jwtid: randomUUID()
  })
}

export function verifyAccess(token: string) {
  return jwt.verify(token, ACCESS_SECRET, { issuer: ISS, audience: AUD }) as AccessClaims &
    jwt.JwtPayload
}

export function signRefresh(userId: string, sessionId: string, ttl = env.JWT_REFRESH_TTL || '7d') {
  const payload: RefreshClaims = { sub: userId, typ: 'refresh', sid: sessionId }
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: ttlToSec(ttl),
    issuer: ISS,
    audience: AUD,
    jwtid: randomUUID()
  })
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, REFRESH_SECRET, { issuer: ISS, audience: AUD }) as RefreshClaims &
    jwt.JwtPayload
}
