import { AppError } from './errors'
import { Plan } from './plan'

export const Limits = {
  projects: { FREE: 2, PRO: 50, TEAM: 1000 } as Record<Plan, number>
  // seats, invoices/mois, etc. — à compléter si tu veux
}

export function assertUnderLimit(entity: 'projects', plan: Plan, currentCount: number) {
  const max = Limits[entity][plan]
  if (currentCount >= max) {
    throw AppError.forbidden(`Plan limit reached for ${entity}: ${max}`)
  }
}
