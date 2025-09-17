import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Database
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_NAME: z.string(),
  // JWT
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_TTL: z.string().default('15m'), // 15 minutes
  JWT_REFRESH_TTL: z.string().default('7d'), // 7 days
  JWT_ISSUER: z.string().default('myapp'),
  JWT_AUDIENCE: z.string().default('myapp-users'),
  // Emails
  EMAIL_VERIFY_TTL: z.string().default('24h'), // 24 hours
  RESET_PWD_TTL: z.string().default('1h'), // 1 hour
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Third-party API keys
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // URLs
  APP_URL: z.string().default('http://localhost:4000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // GitHub OAuth
  GITHUB_TOKEN: z.string().optional(),
  // PDF
  PDF_ENGINE: z.enum(['playwright', 'puppeteer', 'auto']).default('auto'),
  PLAYWRIGHT_CHANNEL: z.string().optional(),
  PLAYWRIGHT_EXECUTABLE_PATH: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PRICE_PRO_MONTH: z.string(),
  STRIPE_PRICE_PRO_YEAR: z.string(),
  STRIPE_PRICE_TEAM_MONTH: z.string(),
  STRIPE_PRICE_TEAM_YEAR: z.string(),
  // Portal
  PORTAL_TOKEN_SECRET: z.string().default('insecure'),
  PORTAL_TOKEN_TTL: z.string().default('30d') // 30 days
})

export const env = EnvSchema.parse(process.env)
