import { NextFunction, Request, Response } from 'express'
import { ensureRedis, redis } from '../config/Ioredis'
import { AppError } from '../utils/errors'

async function hitLimit(key: string, limit: number, windowSec: number) {
  await ensureRedis()
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, windowSec)
  const ttl = await redis.ttl(key)
  return {
    allowed: n <= limit,
    remaining: Math.max(0, limit - n),
    resetSec: Math.max(0, ttl)
  }
}

function getIp(req: Request) {
  const xf = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
  return xf || req.ip || (req.socket as any).remoteAddress || 'unknown'
}

// ---- profils par endpoint (Adjustable) ----
const CONF = {
  login: { ip: { limit: 10, windowSec: 10 * 60 }, email: { limit: 5, windowSec: 10 * 60 } },
  resend: { ip: { limit: 20, windowSec: 60 * 60 }, email: { limit: 3, windowSec: 15 * 60 } },
  forgot: { ip: { limit: 50, windowSec: 24 * 60 * 60 }, email: { limit: 5, windowSec: 30 * 60 } }
}

async function applyLimits(
  req: Request,
  conf: { ip?: { limit: number; windowSec: number }; email?: { limit: number; windowSec: number } }
) {
  const ip = getIp(req)
  const r1 = conf.ip
    ? await hitLimit(`rl:${req.path}:ip:${ip}`, conf.ip.limit, conf.ip.windowSec)
    : null

  if (r1 && !r1.allowed) {
    throw AppError.tooManyRequests(`Too many attempts from your IP. Try again in ${r1.resetSec}s`)
  }

  // email si présent dans le body
  const email = (req.body?.email as string | undefined)?.toLowerCase()
  if (conf.email && email) {
    const r2 = await hitLimit(
      `rl:${req.path}:email:${email}`,
      conf.email.limit,
      conf.email.windowSec
    )
    if (!r2.allowed) {
      throw AppError.tooManyRequests(
        `Too many attempts for this email. Try again in ${r2.resetSec}s`
      )
    }
  }
}

export function limitLogin(req: Request, _res: Response, next: NextFunction) {
  applyLimits(req, CONF.login)
    .then(() => next())
    .catch(next)
}
export function limitResendVerification(req: Request, _res: Response, next: NextFunction) {
  applyLimits(req, CONF.resend)
    .then(() => next())
    .catch(next)
}
export function limitForgotPassword(req: Request, _res: Response, next: NextFunction) {
  applyLimits(req, CONF.forgot)
    .then(() => next())
    .catch(next)
}
