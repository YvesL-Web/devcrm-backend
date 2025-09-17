import { randomUUID } from 'crypto'
import express, { Router } from 'express'
import Stripe from 'stripe'
import { z } from 'zod'

import { AppDataSource } from '../config/data-source.js'
import { Organization } from '../entities/Organization.js'
import { resolvePriceId, stripe } from '../utils/stripe.js'

import { requireAuth, requireRoleAtLeast } from '../middleware/auth.js'
import { requireStripeConfigured, requireWebhookConfigured } from '../middleware/stripeGuard.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'
// ADD
import { Project } from '../entities/Project.js'
import { requireOrg } from '../middleware/auth.js'
import { Limits } from '../utils/limits.js'
import { FeatureKey, FeatureMatrix, Features, hasFeature } from '../utils/plan'

const router = Router()

/**
 * POST /billing/checkout
 * Create a Checkout Session (subscription) for upgrading plan.
 * Requires: OWNER role. Safe if Stripe not configured (guarded).
 */
const checkoutSchema = z.object({
  plan: z.enum(['PRO', 'TEAM']),
  interval: z.enum(['month', 'year']).default('month'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
})

router.post(
  '/billing/checkout',
  requireAuth,
  requireRoleAtLeast('OWNER'),
  requireStripeConfigured,
  asyncHandler(async (req, res) => {
    const { plan, interval, successUrl, cancelUrl } = checkoutSchema.parse(req.body)

    const orgId = (req as any).orgId as string
    const orgRepo = AppDataSource.getRepository(Organization)
    const org = await orgRepo.findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')

    // Ensure (or create) Stripe customer
    let customerId = org.stripeCustomerId || undefined
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          name: org.name,
          metadata: { orgId }
        },
        { idempotencyKey: `org:${orgId}:create_customer` }
      )
      customerId = customer.id
      org.stripeCustomerId = customerId
      await orgRepo.save(org)
    }

    const price = resolvePriceId({ plan, interval })

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        allow_promotion_codes: true,
        success_url:
          successUrl ||
          `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/billing/cancelled`,
        metadata: { orgId }
      },
      { idempotencyKey: (req as any).requestId || randomUUID() }
    )

    return res.json({ url: session.url })
  })
)

/**
 * POST /billing/portal
 * Create a Customer Portal session to manage subscription.
 * Requires: OWNER role. Guarded if Stripe not configured.
 */
router.post(
  '/billing/portal',
  requireAuth,
  requireRoleAtLeast('OWNER'),
  requireStripeConfigured,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
    if (!org?.stripeCustomerId)
      throw AppError.badRequest('No Stripe customer for this organization')

    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`
    })

    return res.json({ url: portal.url })
  })
)

/**
 * WEBHOOK: /billing/webhook
 * Must use raw body parser for signature verification.
 */
const webhookRouter = Router()

webhookRouter.post(
  '/billing/webhook',
  requireWebhookConfigured,
  // Raw body ONLY for this route (Stripe signature)
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const sig = req.headers['stripe-signature'] as string | undefined
      if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' })

      const secret = process.env.STRIPE_WEBHOOK_SECRET!
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, secret)
      } catch (err: any) {
        return res
          .status(400)
          .json({ error: `Webhook signature verification failed: ${err.message}` })
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id
          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer?.id

          if (customerId) {
            const orgRepo = AppDataSource.getRepository(Organization)
            let org =
              (await orgRepo.findOne({ where: { stripeCustomerId: customerId } })) ||
              (session.metadata?.orgId
                ? await orgRepo.findOne({ where: { id: String(session.metadata.orgId) } })
                : null)

            if (org) {
              org.stripeCustomerId = customerId
              if (subscriptionId) {
                org.stripeSubscriptionId = subscriptionId

                // Retrieve subscription & cast → avoids TS issues on Response<T>
                const sub = (await stripe.subscriptions.retrieve(
                  subscriptionId
                )) as Stripe.Subscription

                org.planStatus = sub.status as any
                if ((sub as any).current_period_end)
                  org.planRenewsAt = new Date((sub as any).current_period_end * 1000)

                const priceId = sub.items?.data?.[0]?.price?.id
                if (priceId) {
                  if (
                    [
                      process.env.STRIPE_PRICE_PRO_MONTH,
                      process.env.STRIPE_PRICE_PRO_YEAR
                    ].includes(priceId)
                  ) {
                    org.plan = 'PRO'
                  } else if (
                    [
                      process.env.STRIPE_PRICE_TEAM_MONTH,
                      process.env.STRIPE_PRICE_TEAM_YEAR
                    ].includes(priceId)
                  ) {
                    org.plan = 'TEAM'
                  }
                }
              }
              await orgRepo.save(org)
            }
          }
          break
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription

          const orgRepo = AppDataSource.getRepository(Organization)
          let org =
            (await orgRepo.findOne({ where: { stripeSubscriptionId: sub.id } })) ||
            (sub.customer
              ? await orgRepo.findOne({ where: { stripeCustomerId: String(sub.customer) } })
              : null)

          if (org) {
            org.stripeSubscriptionId = sub.id
            org.planStatus = sub.status as any
            org.planRenewsAt = (sub as any).current_period_end
              ? new Date((sub as any).current_period_end * 1000)
              : null

            // Optionnel : basculer le plan à FREE quand sub est réellement terminée
            // ici on conserve le plan et on se repose sur planStatus pour gating fin de période
            await orgRepo.save(org)
          }
          break
        }

        case 'invoice.paid': {
          // For recurring payments: mark active using customer lookup
          const inv = event.data.object as Stripe.Invoice // Stripe.Invoice (not your entity)
          if (inv.customer) {
            const orgRepo = AppDataSource.getRepository(Organization)
            const org = await orgRepo.findOne({
              where: { stripeCustomerId: String(inv.customer) }
            })
            if (org) {
              org.planStatus = 'active'
              await orgRepo.save(org)
            }
          }
          break
        }

        case 'invoice.payment_failed': {
          const inv = event.data.object as Stripe.Invoice
          if (inv.customer) {
            const orgRepo = AppDataSource.getRepository(Organization)
            const org = await orgRepo.findOne({
              where: { stripeCustomerId: String(inv.customer) }
            })
            if (org) {
              org.planStatus = 'past_due'
              await orgRepo.save(org)
            }
          }
          break
        }

        default:
          // ignore other events
          break
      }

      res.json({ received: true })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * GET /billing/status
 * Retourne le plan de l'org, statut, renouvellement, features activées et limites/usage.
 * Accès: MEMBER+ (lecture)
 */
router.get(
  '/billing/status',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')

    // Usage actuel
    const projectsCount = await AppDataSource.getRepository(Project).count({ where: { orgId } })

    // Limites courantes
    const maxProjects = Limits.projects[org.plan as 'FREE' | 'PRO' | 'TEAM']
    const remainingProjects = Math.max(0, maxProjects - projectsCount)

    // Features activées (booleans)
    const featureKeys = Object.values(Features) as FeatureKey[]
    const features: Record<FeatureKey, boolean> = featureKeys.reduce((acc, key) => {
      acc[key] = hasFeature(org.plan as any, key)
      return acc
    }, {} as Record<FeatureKey, boolean>)

    // Info Stripe minimale (sans appeler Stripe)
    const stripeInfo = {
      configured: !!process.env.STRIPE_SECRET_KEY,
      customerId: org.stripeCustomerId ?? null,
      subscriptionId: org.stripeSubscriptionId ?? null
    }

    return res.json({
      organizationId: org.id,
      plan: org.plan,
      planStatus: org.planStatus ?? null,
      planRenewsAt: org.planRenewsAt ?? null,
      features,
      limits: {
        projects: { max: maxProjects, used: projectsCount, remaining: remainingProjects }
      },
      stripe: stripeInfo
    })
  })
)

/**
 * GET /billing/features
 * Retourne la matrice lisible des features par plan (pour UI).
 * Accès: MEMBER+
 */
router.get(
  '/billing/features',
  requireAuth,
  requireOrg,
  asyncHandler(async (_req, res) => {
    return res.json({ matrix: FeatureMatrix, limits: { projects: Limits.projects } })
  })
)

/**
 * GET /billing/preview?target=PRO|TEAM
 * Compare le plan actuel vs un plan cible et renvoie:
 * - features nouvellement débloquées
 * - nouvelles limites
 * Accès: MEMBER+
 */
router.get(
  '/billing/preview',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const schema = z.object({ target: z.enum(['PRO', 'TEAM']) })
    const { target } = schema.parse({ target: req.query.target })

    const orgId = (req as any).orgId as string
    const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')

    const currentPlan = org.plan as 'FREE' | 'PRO' | 'TEAM'

    // features bool -> liste delta
    const keys = Object.values(Features) as FeatureKey[]
    const newlyUnlocked = keys.filter(
      (k) => !hasFeature(currentPlan as any, k) && hasFeature(target as any, k)
    )

    // limites
    const currentMaxProjects = Limits.projects[currentPlan]
    const targetMaxProjects = Limits.projects[target]

    return res.json({
      from: currentPlan,
      to: target,
      features: { newlyUnlocked },
      limits: {
        projects: { from: currentMaxProjects, to: targetMaxProjects }
      }
    })
  })
)

/**
 * (Optionnel DEV) POST /billing/dev/set-plan
 * Permet de forcer un plan sans Stripe quand NODE_ENV !== 'production'.
 * Accès: OWNER uniquement.
 */
router.post(
  '/billing/dev/set-plan',
  requireAuth,
  requireRoleAtLeast('OWNER'),
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') throw AppError.forbidden('Disabled in production')

    const schema = z.object({ plan: z.enum(['FREE', 'PRO', 'TEAM']) })
    const { plan } = schema.parse(req.body)

    const orgId = (req as any).orgId as string
    const repo = AppDataSource.getRepository(Organization)
    const org = await repo.findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')

    org.plan = plan as any
    // on remet un statut cohérent pour l’UI
    org.planStatus = plan === 'FREE' ? null : 'active'
    await repo.save(org)

    return res.json({ ok: true, plan: org.plan, planStatus: org.planStatus })
  })
)

export default { router, webhookRouter }
