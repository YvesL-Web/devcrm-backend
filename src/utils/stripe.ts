import Stripe from 'stripe'
import { env } from '../config/env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export type StripePlanInput = { plan: 'PRO' | 'TEAM'; interval: 'month' | 'year' }

export function resolvePriceId({ plan, interval }: StripePlanInput) {
  if (plan === 'PRO' && interval === 'month') return env.STRIPE_PRICE_PRO_MONTH!
  if (plan === 'PRO' && interval === 'year') return env.STRIPE_PRICE_PRO_YEAR!
  if (plan === 'TEAM' && interval === 'month') return env.STRIPE_PRICE_TEAM_MONTH!
  if (plan === 'TEAM' && interval === 'year') return env.STRIPE_PRICE_TEAM_YEAR!
  throw new Error('Unknown plan/interval or missing env price id')
}
