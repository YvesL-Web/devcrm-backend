import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { Organization } from '../entities/Organization.js'
import { OrgMember } from '../entities/OrgMember.js'
import { User } from '../entities/User.js'
import { requireAuth, requireOrg, requireRoleAtLeast } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const schema = z.object({ name: z.string().min(1) })
  const parsed = schema.parse(req.body)

  const org = AppDataSource.getRepository(Organization).create({
    name: parsed.name,
    ownerId: (req as any).userId
  })
  await AppDataSource.getRepository(Organization).save(org)
  await AppDataSource.getRepository(OrgMember).save({
    orgId: org.id,
    userId: (req as any).userId,
    role: 'OWNER'
  })
  return res.json({ org })
})

// GET current org settings (readable by any member)
router.get(
  '/settings',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')
    return res.json({ org })
  })
)

// PATCH current org settings (OWNER only)
const settingsSchema = z.object({
  name: z.string().min(1).optional(),

  defaultCurrency: z.string().min(3).max(3).optional(),
  locale: z.string().min(2).max(10).optional(),

  logoUrl: z.url().nullable().optional(),

  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(30).nullable().optional(),
  country: z.string().max(2).nullable().optional(), // ISO 3166-1 alpha-2

  taxId: z.string().max(60).nullable().optional(),
  vatNumber: z.string().max(60).nullable().optional(),

  invoiceFooter: z.string().max(5000).nullable().optional()
})

router.patch(
  '/settings',
  requireAuth,
  requireRoleAtLeast('OWNER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const patch = settingsSchema.parse(req.body)

    const repo = AppDataSource.getRepository(Organization)
    const org = await repo.findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')

    Object.assign(org, patch)
    await repo.save(org)

    return res.json({ org })
  })
)

router.get(
  '/members',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string

    const rows = await AppDataSource.getRepository(OrgMember)
      .createQueryBuilder('m')
      .leftJoin(User, 'u', 'u.id = m.userId')
      .select([
        'm.userId AS "userId"',
        'm.orgId  AS "orgId"',
        'm.role   AS "role"',
        'u.name   AS "name"',
        'u.email  AS "email"'
      ])
      .where('m.orgId = :orgId', { orgId })
      .orderBy('m.role', 'DESC')
      .getRawMany()

    res.json({ rows })
  })
)

export default router
