import { Router } from 'express'
import { In } from 'typeorm'
import { z } from 'zod'

import { AppDataSource } from '../config/data-source.js'
import { Organization } from '../entities/Organization.js'
import { OrgMember } from '../entities/OrgMember.js'
import { User } from '../entities/User.js'
import { requireAuth } from '../middleware/auth.js'
import { emailQueue } from '../queues_workers/queues/queues.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'
import { signAccess, signRefresh, verifyRefresh } from '../utils/jwt.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import {
  assertRefreshSession,
  consumeEmailVerifyToken,
  consumeResetPwdToken,
  createEmailVerifyToken,
  createRefreshSession,
  createResetPwdToken,
  revokeRefreshSession,
  rotateRefreshSession
} from '../utils/token.js'

import {
  limitForgotPassword,
  limitLogin,
  limitResendVerification
} from '../middleware/rateLimit.js'

const router = Router()

const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(6),
  orgName: z.string().min(1).default('My Organization')
})

/** REGISTER */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, name, password, orgName } = registerSchema.parse(req.body)
    const userRepo = AppDataSource.getRepository(User)
    const existing = await userRepo.findOne({ where: { email: email.toLowerCase() } })
    if (existing) throw AppError.conflict('Email already registered')

    const user = userRepo.create({ email, name, passwordHash: await hashPassword(password) })
    await userRepo.save(user)

    // org by default
    const orgRepo = AppDataSource.getRepository(Organization)
    const org = orgRepo.create({ name: orgName, ownerId: user.id, plan: 'FREE' })
    await orgRepo.save(org)

    // member owner
    const memRepo = AppDataSource.getRepository(OrgMember)
    const mem = memRepo.create({ userId: user.id, orgId: org.id, role: 'OWNER' })
    await memRepo.save(mem)

    // email verification
    const verifyToken = await createEmailVerifyToken(user.id)

    await emailQueue.add('sendVerificationEmail', {
      to: user.email,
      token: verifyToken
    })

    return res.json({
      userId: user.id,
      orgId: org.id,
      verifyEmailSent: true,
      message: 'Check your inbox to verify your email before logging in.'
    })
  })
)

/** RESEND VERIFICATION */
router.post(
  '/resend-verification',
  limitResendVerification,
  asyncHandler(async (req, res) => {
    const schema = z.object({ email: z.email() })
    const { email } = schema.parse(req.body)
    const user = await AppDataSource.getRepository(User).findOne({ where: { email } })
    if (!user) return res.json({ ok: true }) // do not reveal whether email is registered
    if (user.emailVerifiedAt) return res.json({ ok: true }) // already verified

    const token = await createEmailVerifyToken(user.id)
    await emailQueue.add('sendVerificationEmail', {
      to: user.email,
      token
    })

    res.json({ ok: true })
  })
)

/** VERIFY EMAIL */
router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const schema = z.object({ token: z.string().min(10) })
    const { token } = schema.parse(req.body)
    const userId = await consumeEmailVerifyToken(token)
    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { id: userId } })
    if (!user) throw AppError.notFound('User not found')
    user.emailVerifiedAt = new Date()
    await userRepo.save(user)
    res.json({ ok: true })
  })
)

/** LOGIN */
router.post(
  '/login',
  limitLogin,
  asyncHandler(async (req, res) => {
    const loginSchema = z.object({ email: z.email(), password: z.string().min(6) })
    const { email, password } = loginSchema.parse(req.body)

    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { email } })
    if (!user) throw AppError.unauthorized('Invalid credentials')

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) throw AppError.unauthorized('Invalid credentials')

    if (!user.emailVerifiedAt) {
      throw AppError.unauthorized('Email not verified')
    }

    user.lastLoginAt = new Date()
    await userRepo.save(user)

    // pick une org (la première) pour le token d’accès initial
    const mem = await AppDataSource.getRepository(OrgMember).findOne({ where: { userId: user.id } })
    const orgId = mem?.orgId

    const sid = await createRefreshSession(user.id)
    const refresh = signRefresh(user.id, sid)
    const access = signAccess(user.id, orgId)

    res.json({
      userId: user.id,
      accessToken: access,
      refreshToken: refresh,
      emailVerified: !!user.emailVerifiedAt
    })
  })
)

/** REFRESH */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const schema = z.object({ refreshToken: z.string().min(10) })
    const { refreshToken } = schema.parse(req.body)

    const claims = verifyRefresh(refreshToken)
    await assertRefreshSession(claims.sid, claims.sub)

    const newSid = await rotateRefreshSession(claims.sid, claims.sub)
    const newRefresh = signRefresh(claims.sub, newSid)
    const access = signAccess(claims.sub)

    res.json({ accessToken: access, refreshToken: newRefresh })
  })
)

/** LOGOUT */
router.post('/logout', async (req, res) => {
  const schema = z.object({ refreshToken: z.string().min(10) })
  const { refreshToken } = schema.parse(req.body)
  const claims = verifyRefresh(refreshToken)
  await revokeRefreshSession(claims.sid)
  return res.json({ ok: true })
})

/** FORGOT PASSWORD */
router.post(
  '/forgot-password',
  limitForgotPassword,
  asyncHandler(async (req, res) => {
    const schema = z.object({ email: z.email() })
    const { email } = schema.parse(req.body)
    const user = await AppDataSource.getRepository(User).findOne({ where: { email } })
    if (!user) return res.json({ ok: true }) // do not reveal whether email is registered
    const token = await createResetPwdToken(user.id)
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`
    await emailQueue.add('sendResetPwdEmail', { to: user.email, url })
    res.json({ ok: true })
  })
)

/** RESET PASSWORD */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const schema = z.object({ token: z.string().min(10), newPassword: z.string().min(8) })
    const { token, newPassword } = schema.parse(req.body)
    const userId = await consumeResetPwdToken(token)
    const repo = AppDataSource.getRepository(User)
    const user = await repo.findOne({ where: { id: userId } })
    if (!user) throw AppError.notFound('User not found')
    user.passwordHash = await hashPassword(newPassword)
    await repo.save(user)
    res.json({ ok: true })
  })
)

/**ME */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId as string
    // organisations du user (pour un menu org-switcher côté front)
    const memberships = await AppDataSource.getRepository(OrgMember).find({ where: { userId } })
    const orgIds = memberships.map((m) => m.orgId)

    const orgs = orgIds.length
      ? await AppDataSource.getRepository(Organization).find({ where: { id: In(orgIds) } })
      : []

    const data = memberships
      .map((m) => {
        const org = orgs.find((o) => o.id === m.orgId)
        return org
          ? {
              orgId: org.id,
              orgName: org.name,
              role: m.role,
              plan: org.plan,
              planStatus: org.planStatus ?? null
            }
          : null
      })
      .filter(Boolean)

    return res.json({
      user: { id: userId }, // ajoute email/name si tu veux
      orgs: data
    })
  })
)

export default router
