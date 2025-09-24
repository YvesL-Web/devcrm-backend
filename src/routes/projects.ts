import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source'
import { Client, Task } from '../entities'
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

// -------- OVERVIEW --------

const qSchema = z.object({
  assigneeId: z.uuid().optional(),
  label: z.string().max(60).optional()
})

router.get(
  '/:id/overview',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const projectId = req.params.id
    const { assigneeId, label } = qSchema.parse(req.query)

    const project = await AppDataSource.getRepository(Project).findOne({
      where: { id: projectId, orgId }
    })
    if (!project) throw AppError.notFound('Project not found')

    const taskRepo = AppDataSource.getRepository(Task)

    // helper to add where fragments
    const baseWhere = 't.orgId = :orgId AND t.projectId = :projectId'
    const baseParams: any = { orgId, projectId }

    function withFilters(qb: ReturnType<typeof taskRepo.createQueryBuilder>) {
      if (assigneeId) qb.andWhere('t.assigneeId = :assigneeId', { assigneeId })
      if (label) qb.andWhere(':label = ANY(t.labels)', { label })
      return qb
    }

    const [total, open, inprog, done, overdue] = await Promise.all([
      withFilters(taskRepo.createQueryBuilder('t').where(baseWhere, baseParams)).getCount(),

      withFilters(
        taskRepo.createQueryBuilder('t').where(`${baseWhere} AND t.status = 'OPEN'`, baseParams)
      ).getCount(),

      withFilters(
        taskRepo
          .createQueryBuilder('t')
          .where(`${baseWhere} AND t.status = 'IN_PROGRESS'`, baseParams)
      ).getCount(),

      withFilters(
        taskRepo.createQueryBuilder('t').where(`${baseWhere} AND t.status = 'DONE'`, baseParams)
      ).getCount(),

      // overdue: dueDate < today & not DONE
      withFilters(
        taskRepo
          .createQueryBuilder('t')
          .where(baseWhere, baseParams)
          .andWhere("t.status IN ('OPEN','IN_PROGRESS')")
          .andWhere('t.dueDate IS NOT NULL AND t.dueDate < :today', {
            today: new Date().toISOString().slice(0, 10)
          })
      ).getCount()
    ])

    // 30 jours: created per day
    const from = new Date()
    from.setDate(from.getDate() - 29)
    from.setHours(0, 0, 0, 0)

    const createdRowsQb = withFilters(
      taskRepo
        .createQueryBuilder('t')
        .select("date_trunc('day', t.createdAt)", 'day')
        .addSelect('COUNT(*)', 'cnt')
        .where(`${baseWhere} AND t.createdAt >= :from`, { ...baseParams, from })
        .groupBy("date_trunc('day', t.createdAt)")
        .orderBy('day', 'ASC')
    )
    const createdRows = await createdRowsQb.getRawMany<{ day: Date; cnt: string }>()

    const createdSeries: { date: string; count: number }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const found = createdRows.find((r) => r.day.toISOString().slice(0, 10) === key)
      createdSeries.push({ date: key, count: found ? Number(found.cnt) : 0 })
    }

    // Burndown (open count per day) avec filtres
    const burndown: { date: string; open: number }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      const end = new Date(d)
      end.setHours(23, 59, 59, 999)

      const qb = withFilters(
        taskRepo
          .createQueryBuilder('t')
          .where(baseWhere, baseParams)
          .andWhere('t.createdAt <= :end', { end })
          .andWhere('(t.doneAt IS NULL OR t.doneAt > :end)', { end })
      )
      const count = await qb.getCount()
      burndown.push({ date: d.toISOString().slice(0, 10), open: count })
    }

    // Lead time (avg days) sur 90 jours avec filtres
    const from90 = new Date()
    from90.setDate(from90.getDate() - 90)
    from90.setHours(0, 0, 0, 0)
    const doneWithin = await withFilters(
      taskRepo
        .createQueryBuilder('t')
        .select(['t.createdAt', 't.doneAt'])
        .where(`${baseWhere} AND t.doneAt IS NOT NULL AND t.doneAt >= :from90`, {
          ...baseParams,
          from90
        })
    ).getMany()

    let leadTimeDays = 0
    if (doneWithin.length) {
      const totalMs = doneWithin.reduce(
        (acc, t) => acc + (t.doneAt!.getTime() - t.createdAt.getTime() || 0),
        0
      )
      leadTimeDays = Math.round((totalMs / doneWithin.length / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    res.json({
      stats: { total, open, inProgress: inprog, done, overdue, leadTimeDays },
      createdPerDay: createdSeries,
      burndown
    })
  })
)

export default router
