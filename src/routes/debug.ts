import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { verifyAccess } from '../utils/jwt.js'

const r = Router()
r.get('/auth-header', (req, res) => {
  res.json({
    authorization: req.headers.authorization || null,
    xOrgId: req.headers['x-org-id'] || null
  })
})
r.get('/whoami', requireAuth, (req, res) => {
  const auth = req.headers.authorization?.replace(/^Bearer /, '') || ''
  let claims: any = null
  try {
    claims = verifyAccess(auth)
  } catch {}
  res.json({ userId: (req as any).userId || null, orgId: (req as any).orgId || null, claims })
})

export default r
