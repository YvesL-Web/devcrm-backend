import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'

import { errorHandler, notFound } from './middleware/errors'

import authRoutes from './routes/auth'
import billing from './routes/billing'
import clientRoutes from './routes/clients'
import debugRoutes from './routes/debug'
import integrationRoutes from './routes/integrations'
import invoiceRoutes from './routes/invoices'
import orgRoutes from './routes/orgs'
import portalRoutes from './routes/portal'
import projectRoutes from './routes/projects'
import releaseRoutes from './routes/releases'
import taskRoutes from './routes/tasks'
import timeRoutes from './routes/time'

import { env } from './config/env'

export const createApp = () => {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: [env.FRONTEND_URL],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id'],
      // exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: false,
      maxAge: 86400 // 24 hours
    })
  )
  // (optionnel) si tu as des routes custom pour OPTIONS :
  // app.options('*', cors())
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan('dev'))
  app.set('trust proxy', 1)
  app.use(rateLimit({ windowMs: 60_000, max: 120 }))

  app.use(billing.webhookRouter) // ⚠️ route raw: /billing/webhook
  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/auth', authRoutes)
  app.use('/orgs', orgRoutes)
  app.use('/clients', clientRoutes)
  app.use('/projects', projectRoutes)
  app.use('/releases', releaseRoutes)
  app.use('/tasks', taskRoutes)
  app.use('/portal', portalRoutes)
  app.use('/invoices', invoiceRoutes)
  app.use('/', timeRoutes)
  app.use('/', integrationRoutes)
  app.use('/', billing.router)

  app.use('/_debug', debugRoutes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
