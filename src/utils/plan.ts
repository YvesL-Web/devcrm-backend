export type Plan = 'FREE' | 'PRO' | 'TEAM'

export const PlanRank = { FREE: 1, PRO: 2, TEAM: 3 } as const
export function hasPlanAtLeast(current: Plan, min: Plan) {
  return (PlanRank[current] ?? 0) >= (PlanRank[min] ?? 0)
}

// === Features existantes ===
export const Features = {
  INVOICE_EMAIL: 'invoice_email',
  GITHUB_IMPORT: 'github_import',
  CUSTOM_INVOICE_TEMPLATE: 'custom_invoice_template',
  CLIENT_PORTAL: 'client_portal'
} as const
export type FeatureKey = (typeof Features)[keyof typeof Features]

// Min plan actuel par feature
const FeatureMinPlan: Record<FeatureKey, Plan> = {
  invoice_email: 'PRO',
  github_import: 'PRO',
  custom_invoice_template: 'PRO',
  client_portal: 'PRO' // FREE verra juste un portal basique via les routes publiques si tu veux; ici on garde PRO pour les options avancées
}
export function hasFeature(plan: Plan, feature: FeatureKey) {
  return hasPlanAtLeast(plan, FeatureMinPlan[feature])
}

// === Limites / capacités transverses ===
export const PlanLimits: Record<Plan, { seats: number; projectsMax: number }> = {
  FREE: { seats: 1, projectsMax: 2 },
  PRO: { seats: 5, projectsMax: 50 },
  TEAM: { seats: 25, projectsMax: 1000 }
}

// Capacités “métier” (sans gonfler Features)
export const Capabilities = {
  CAN_ASSIGN_OTHERS: (plan: Plan) => hasPlanAtLeast(plan, 'PRO'), // assignee ≠ soi
  HAS_WATCHERS: (plan: Plan) => hasPlanAtLeast(plan, 'PRO'), // suivre une tâche
  CAN_INVITE: (plan: Plan) => hasPlanAtLeast(plan, 'PRO') // inviter des membres
} as const

// (Optionnel) résumé lisible
export const FeatureMatrix: Record<Plan, string[]> = {
  FREE: ['PDF invoices', 'Up to 2 projects', 'Solo only'],
  PRO: [
    'Everything in FREE',
    'Invoice email sending',
    'GitHub PR import (changelogs)',
    'Custom invoice template',
    'Up to 50 projects',
    'Team seats (5), assignees, watchers, invites'
  ],
  TEAM: [
    'Everything in PRO',
    'More seats (25)',
    'High limits (1000 projects)',
    'Room for advanced features later'
  ]
}
