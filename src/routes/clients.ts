import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { Client } from '../entities/Client.js'
import {
  requireAuth,
  requireOrg,
  requireRoleAtLeast,
  requireVerifyEmail
} from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'

const router = Router()

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional()
})

/** LIST */
router.get(
  '/',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const { page, pageSize, q } = listQuery.parse(req.query)

    const qb = AppDataSource.getRepository(Client)
      .createQueryBuilder('c')
      .where('c.orgId = :orgId', { orgId })

    if (q) {
      qb.andWhere(
        '(c.name ILIKE :q OR c.company ILIKE :q OR c.email ILIKE :q OR c.phone ILIKE :q)',
        { q: `%${q}%` }
      )
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [rows, total] = await qb.getManyAndCount()
    res.json({ rows, total, page, pageSize })
  })
)

/** GET by id */
router.get(
  '/:id',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const c = await AppDataSource.getRepository(Client).findOne({ where: { id: id, orgId: orgId } })
    if (!c) throw AppError.notFound('Client not found')
    res.json(c)
  })
)

const upsertBody = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  notes: z.string().max(10000).nullable().optional()
})

/** CREATE */
router.post(
  '/',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const b = upsertBody.parse(req.body)
    const repo = AppDataSource.getRepository(Client)
    const c = repo.create({
      orgId,
      name: b.name.trim(),
      company: b.company?.trim() || null,
      email: b.email?.trim() || null,
      phone: b.phone?.trim() || null,
      addressLine1: b.addressLine1?.trim() || null,
      addressLine2: b.addressLine2?.trim() || null,
      city: b.city?.trim() || null,
      state: b.state?.trim() || null,
      postalCode: b.postalCode?.trim() || null,
      country: b.country?.trim() || null,
      notes: b.notes?.trim() || null
    })
    await repo.save(c)
    res.status(201).json(c)
  })
)

/** UPDATE */
router.patch(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Client)
    const c = await repo.findOne({ where: { id, orgId } })
    if (!c) throw AppError.notFound('Client not found')

    const b = upsertBody.partial().parse(req.body)

    if ('name' in b && b.name != null) c.name = b.name.trim()
    if ('company' in b) c.company = b.company?.trim() || null
    if ('email' in b) c.email = b.email?.trim() || null
    if ('phone' in b) c.phone = b.phone?.trim() || null
    if ('addressLine1' in b) c.addressLine1 = b.addressLine1?.trim() || null
    if ('addressLine2' in b) c.addressLine2 = b.addressLine2?.trim() || null
    if ('city' in b) c.city = b.city?.trim() || null
    if ('state' in b) c.state = b.state?.trim() || null
    if ('postalCode' in b) c.postalCode = b.postalCode?.trim() || null
    if ('country' in b) c.country = b.country?.trim() || null
    if ('notes' in b) c.notes = b.notes?.trim() || null

    await repo.save(c)
    res.json(c)
  })
)

/** DELETE */
router.delete(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Client)
    const c = await repo.findOne({ where: { id, orgId } })
    if (!c) throw AppError.notFound('Client not found')
    await repo.remove(c)
    res.status(204).end()
  })
)

export default router
