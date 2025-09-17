import { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.js'

export function requireStripeConfigured(_req: Request, _res: Response, next: NextFunction) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(AppError.badRequest('Stripe is not configured yet (missing STRIPE_SECRET_KEY)'))
  }
  return next()
}

export function requireWebhookConfigured(_req: Request, _res: Response, next: NextFunction) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return next(
      AppError.badRequest('Stripe webhook is not configured (missing STRIPE_WEBHOOK_SECRET)')
    )
  }
  return next()
}
