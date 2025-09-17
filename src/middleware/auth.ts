import { NextFunction, Request, Response } from 'express'
import { AppDataSource } from '../config/data-source.js'
import { OrgMember } from '../entities/OrgMember.js'
import { User } from '../entities/User.js'
import { AppError } from '../utils/errors.js'
import { verifyAccess } from '../utils/jwt.js'

export type AuthedRequest = Request & { userId?: string; orgId?: string }

export const requireAuth = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization || ''
    const m = auth.match(/^Bearer (.+)$/)
    if (!m) throw AppError.unauthorized('Missing Bearer token')
    const token = m[1]
    const claims = verifyAccess(token)
    ;(req as any).userId = claims.sub
    const orgId = (req.headers['x-org-id'] as string | undefined) || claims.orgId
    if (orgId) (req as any).orgId = orgId
    next()
  } catch (error: any) {
    next(AppError.unauthorized(error?.message || 'Unauthorized'))
  }
}

export async function requireVerifyEmail(req: Request, _res: Response, next: NextFunction) {
  const userId = (req as any).userId as string
  if (!userId) return next(AppError.unauthorized())
  const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } })
  if (!user) return next(AppError.unauthorized())
  if (!user.emailVerifiedAt) return next(AppError.forbidden('Email not verified'))
  next()
}

/**
 * Ensures the user is a member of the org (via X-Org-Id header) and sets req.orgId.
 */
export const requireOrg = async (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const orgId = (req.header('X-Org-Id') || req.orgId) as string | undefined
  if (!orgId) return next(AppError.badRequest('X-Org-Id required'))
  if (!req.userId) return next(AppError.unauthorized())
  const repo = AppDataSource.getRepository(OrgMember)
  const membership = await repo.findOne({ where: { orgId, userId: req.userId } })
  if (!membership) return next(AppError.forbidden('Not a member of this org'))
  req.orgId = orgId
  next()
}

const RoleRank = { CLIENT_VIEWER: 1, MEMBER: 2, OWNER: 3 } as const
type Role = keyof typeof RoleRank

/**
 * Same as requireOrg, but enforces a minimum role level.
 */
export const requireRoleAtLeast = (min: Role) => {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const orgId = (req.header('X-Org-Id') || req.orgId) as string | undefined
    if (!orgId) return next(AppError.badRequest('X-Org-Id required'))
    if (!req.userId) return next(AppError.unauthorized())
    const repo = AppDataSource.getRepository(OrgMember)
    const membership = await repo.findOne({ where: { orgId, userId: req.userId } })
    if (!membership) return next(AppError.forbidden('Not a member of this org'))
    req.orgId = orgId

    const current = membership.role as Role
    if ((RoleRank[current] ?? 0) < RoleRank[min]) {
      return next(AppError.forbidden('Insufficient role'))
    }
    next()
  }
}
