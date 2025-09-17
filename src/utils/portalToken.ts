import jwt from 'jsonwebtoken'
import { env } from '../config/env'

const SECRET = env.PORTAL_TOKEN_SECRET
const TTL = env.PORTAL_TOKEN_TTL

type PortalTokenPayload = { typ: 'invoice'; orgId: string; invoiceId: string }

export function signInvoiceToken(orgId: string, invoiceId: string, ttl: number = TTL) {
  const payload: PortalTokenPayload = { typ: 'invoice', orgId, invoiceId }
  return jwt.sign(payload, SECRET, { expiresIn: ttl })
}

export function verifyInvoiceToken(token: string): PortalTokenPayload {
  const payload = jwt.verify(token, SECRET) as PortalTokenPayload
  if (payload.typ !== 'invoice') throw new Error('Invalid token type')
  return payload
}
