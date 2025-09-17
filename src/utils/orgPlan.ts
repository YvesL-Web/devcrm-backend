import { AppDataSource } from '../config/data-source.js'
import { Organization } from '../entities/Organization.js'
import { AppError } from './errors.js'
import { Plan, PlanLimits } from './plan.js'

export async function getOrgOrThrow(orgId: string) {
  const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
  if (!org) throw AppError.notFound('Organization not found')
  return org
}

export function getPlanLimits(plan: Plan) {
  return PlanLimits[plan]
}
