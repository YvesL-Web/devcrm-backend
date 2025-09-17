import { NextFunction, Response } from 'express'
import { AppDataSource } from '../config/data-source'
import { Organization } from '../entities/Organization'
import { AppError } from '../utils/errors'
import { FeatureKey, hasFeature, hasPlanAtLeast, Plan } from '../utils/plan'
import { AuthedRequest } from './auth'

async function loadOrgPlan(req: AuthedRequest): Promise<Plan> {
  const orgId = (req.header('X-Org-Id') || req.orgId) as string | undefined
  if (!orgId) throw AppError.badRequest('X-Org-Id required')
  const repo = AppDataSource.getRepository(Organization)
  const org = await repo.findOne({ where: { id: orgId } })
  if (!org) throw AppError.notFound('Organization not found')
  ;(req as any)._orgPlan = org.plan // cache per request
  return org.plan as Plan
}

export const requirePlanAtLeast = (min: Plan) => {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const plan: Plan = (req as any)._orgPlan || (await loadOrgPlan(req))
      if (!hasPlanAtLeast(plan, min))
        return next(AppError.forbidden('Plan too low for this operation'))
      next()
    } catch (e) {
      next(e)
    }
  }
}

export const requireFeature = (feature: FeatureKey) => {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const plan: Plan = (req as any)._orgPlan || (await loadOrgPlan(req))
      if (!hasFeature(plan, feature))
        return next(AppError.forbidden(`Feature requires a higher plan (${feature})`))
      next()
    } catch (e) {
      next(e)
    }
  }
}
