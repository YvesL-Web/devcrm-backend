import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source'
import { Client } from '../entities'
import { Project } from '../entities/Project'
import { requireAuth, requireOrg, requireRoleAtLeast, requireVerifyEmail } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { getOrgOrThrow, getPlanLimits } from '../utils/orgPlan'
import { slugify } from '../utils/slug'

const router = Router()

// -------- LIST --------
const listQuery = z.object({
  q: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

router.get(
  '/',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const { q, status, page, pageSize } = listQuery.parse(req.query)
    const orgId = (req as any).orgId as string

    const repo = AppDataSource.getRepository(Project)
    const qb = repo.createQueryBuilder('p').where('p.orgId = :orgId', { orgId })
    if (status) qb.andWhere('p.status = :status', { status })
    if (q) qb.andWhere('p.name ILIKE :q', { q: `%${q}%` })

    const [rows, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    return res.json({ rows, total, page, pageSize })
  })
)

// -------- CREATE --------
const createBody = z.object({
  name: z.string().min(1).max(160),
  clientId: z.uuid().nullable().optional(),
  portalPublic: z.boolean().optional(),
  portalShowChangelog: z.boolean().optional(),
  portalShowInvoices: z.boolean().optional(),
  portalWelcome: z.string().max(10_000).nullable().optional()
})

router.post(
  '/',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const body = createBody.parse(req.body)

    // Limit per plan
    const org = getOrgOrThrow(orgId)
    const lim = getPlanLimits((await org).plan)
    const repo = AppDataSource.getRepository(Project)
    const count = await repo.count({ where: { orgId } })
    if (count >= lim.projectsMax) {
      throw AppError.forbidden(
        `Project limit reached (${lim.projectsMax}). Please archive or delete existing projects, or upgrade your plan.`
      )
    }

    // slug unique (global) avec incréments -p2, -p3 si collision
    let base = slugify(body.name)
    if (!base) base = 'project'
    let slug = base
    let i = 2
    // eslint-disable-next-line no-constant-condition
    while (await repo.findOne({ where: { portalSlug: slug } })) {
      slug = `${base}-p${i++}`
    }

    const project = repo.create({
      orgId,
      clientId: body.clientId ?? null,
      name: body.name,
      portalSlug: slug,
      status: 'ACTIVE',
      portalPublic: body.portalPublic ?? true,
      portalShowChangelog: body.portalShowChangelog ?? true,
      portalShowInvoices: body.portalShowInvoices ?? true,
      portalWelcome: body.portalWelcome ?? null
    })
    await repo.save(project)
    res.status(201).json(project)
  })
)

// -------- READ --------
router.get(
  '/:id',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Project)
    const p = await repo.findOne({ where: { id, orgId } })
    if (!p) throw AppError.notFound('Project not found')
    res.json(p)
  })
)

// -------- UPDATE (PATCH) --------
const updateBody = z.object({
  name: z.string().min(1).max(160).optional(),
  clientId: z.uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  portalPublic: z.boolean().optional(),
  portalShowChangelog: z.boolean().optional(),
  portalShowInvoices: z.boolean().optional(),
  portalWelcome: z.string().max(10_000).nullable().optional()
  // changer le slug (rare), décommente:
  // portalSlug: z.string().min(1).max(160).optional(),
})

router.patch(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const data = updateBody.parse(req.body)

    const repo = AppDataSource.getRepository(Project)
    const p = await repo.findOne({ where: { id, orgId } })
    if (!p) throw AppError.notFound('Project not found')

    if (data.name !== undefined) p.name = data.name
    if (data.clientId !== undefined) {
      const clientId = data.clientId
      p.clientId = clientId
      if (clientId) {
        const clientRepo = AppDataSource.getRepository(Client)
        const client = await clientRepo.findOne({ where: { id: clientId, orgId } })
        if (!client) throw AppError.badRequest('Client not found in this organization')
      }
    }
    if (data.status !== undefined) p.status = data.status
    if (data.portalPublic !== undefined) p.portalPublic = data.portalPublic
    if (data.portalShowChangelog !== undefined) p.portalShowChangelog = data.portalShowChangelog
    if (data.portalShowInvoices !== undefined) p.portalShowInvoices = data.portalShowInvoices
    if (data.portalWelcome !== undefined) p.portalWelcome = data.portalWelcome
    // if (data.portalSlug) { ... vérifier unicité globale si tu l’ouvres }

    await repo.save(p)
    res.json(p)
  })
)

// -------- DELETE --------
router.delete(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('OWNER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Project)
    const p = await repo.findOne({ where: { id: id, orgId: orgId } })
    if (!p) throw AppError.notFound('Project not found')
    await repo.remove(p)
    res.status(204).end()
  })
)

export default router
