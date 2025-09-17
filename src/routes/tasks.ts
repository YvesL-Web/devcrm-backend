import { Router } from 'express'
import { In } from 'typeorm'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { Project } from '../entities/Project.js'
import { Task } from '../entities/Task.js'
import { TaskComment } from '../entities/TaskComment.js'
import {
  requireAuth,
  requireOrg,
  requireRoleAtLeast,
  requireVerifyEmail
} from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'
import { getOrgOrThrow } from '../utils/orgPlan.js'
import { Capabilities } from '../utils/plan.js'

const router = Router()

const dateYYYYMMDD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use YYYY-MM-DD' })

async function assertProjectInOrg(projectId: string, orgId: string) {
  const p = await AppDataSource.getRepository(Project).findOne({ where: { id: projectId, orgId } })
  if (!p) throw AppError.forbidden('Project not in your organization')
}

// ----- KANBAN REORDER -----
const reorderSchema = z.object({
  projectId: z.uuid(),
  columns: z.object({
    OPEN: z.array(z.uuid()),
    IN_PROGRESS: z.array(z.uuid()),
    DONE: z.array(z.uuid())
  })
})

// -------- LIST --------
const listQuery = z.object({
  projectId: z.uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'kanbanOrder']).optional(),
  order: z.enum(['ASC', 'DESC']).default('DESC')
})

router.get(
  '/',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const { projectId, status, q, page, pageSize, sort, order } = listQuery.parse(req.query)

    const repo = AppDataSource.getRepository(Task)
    const qb = repo.createQueryBuilder('t').where('t.orgId = :orgId', { orgId })

    if (projectId) {
      await assertProjectInOrg(projectId, orgId)
      qb.andWhere('t.projectId = :projectId', { projectId })
    }
    if (status) qb.andWhere('t.status = :status', { status })
    // if (assigneeId) qb.andWhere('t.assigneeId = :assigneeId', { assigneeId })
    if (q) qb.andWhere('(t.title ILIKE :q OR t.description ILIKE :q)', { q: `%${q}%` })

    if (sort) qb.orderBy(`t.${sort}`, order)
    else qb.orderBy('t.createdAt', 'DESC')

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    res.json({ rows, total, page, pageSize })
  })
)

// -------- CREATE --------
const createBody = z.object({
  projectId: z.uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(20_000).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.uuid().nullable().optional(),
  dueDate: dateYYYYMMDD.nullable().optional(),
  labels: z.array(z.string().min(1)).max(20).nullable().optional(),
  githubIssueUrl: z.url().nullable().optional()
})

router.post(
  '/',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const body = createBody.parse(req.body)

    await assertProjectInOrg(body.projectId, orgId)

    // Gating assignation en Free
    const org = await getOrgOrThrow(orgId)
    const canAssignOthers = Capabilities.CAN_ASSIGN_OTHERS(org.plan as any)
    let assigneeId = body.assigneeId ?? null
    if (!canAssignOthers) {
      if (assigneeId && assigneeId !== userId) {
        throw AppError.forbidden('Your plan does not allow assigning tasks to others')
      }
      // Option: auto-assign self en FREE
      // assigneeId = userId
    }

    const repo = AppDataSource.getRepository(Task)
    const last = await repo
      .createQueryBuilder('t')
      .where('t.orgId = :orgId AND t.projectId = :projectId AND t.status = :status', {
        orgId,
        projectId: body.projectId,
        status: body.status
      })
      .orderBy('t.kanbanOrder', 'DESC')
      .getOne()
    const nextOrder = (last?.kanbanOrder ?? 0) + 1

    const t = repo.create({
      orgId,
      projectId: body.projectId,
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate ?? null,
      assigneeId,
      labels: body.labels ?? null,
      kanbanOrder: nextOrder
    })
    await repo.save(t)
    res.status(201).json(t)
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
    const repo = AppDataSource.getRepository(Task)
    const t = await repo.findOne({ where: { id, orgId } })
    if (!t) throw AppError.notFound('Task not found')
    res.json(t)
  })
)

// -------- UPDATE --------
const updateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20_000).nullable().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.uuid().nullable().optional(),
  dueDate: dateYYYYMMDD.nullable().optional(),
  labels: z.array(z.string().min(1).max(50)).max(20).nullable().optional(),
  githubIssueUrl: z.url().nullable().optional()
})

router.patch(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const id = req.params.id
    const data = updateBody.parse(req.body)

    const repo = AppDataSource.getRepository(Task)
    const t = await repo.findOne({ where: { id, orgId } })
    if (!t) throw AppError.notFound('Task not found')

    // Gating assignee en FREE
    if (typeof data.assigneeId !== 'undefined') {
      const org = await getOrgOrThrow(orgId)
      const canAssignOthers = Capabilities.CAN_ASSIGN_OTHERS(org.plan as any)
      if (!canAssignOthers && data.assigneeId && data.assigneeId !== userId) {
        throw AppError.forbidden('Assigning tasks to other members requires PRO plan')
      }
    }

    const beforeStatus = t.status
    Object.assign(t, data)

    // si on permet de changer de project: vérifier appartenance
    // if (data && (data as any).projectId && (data as any).projectId !== t.projectId) {
    //   await assertProjectInOrg((data as any).projectId, orgId)
    // }
    // si colonne changée, pousse à la fin
    if (data.status && data.status !== beforeStatus) {
      const last = await repo
        .createQueryBuilder('x')
        .where('x.orgId = :orgId AND x.projectId = :projectId AND x.status = :status', {
          orgId,
          projectId: t.projectId,
          status: t.status
        })
        .orderBy('x.kanbanOrder', 'DESC')
        .getOne()
      t.kanbanOrder = (last?.kanbanOrder ?? 0) + 1
    }

    if ('labels' in data) {
      if (data.labels == null) {
        t.labels = null
      } else {
        const uniq = Array.from(new Set(data.labels.map((s) => s.trim()).filter(Boolean)))
        t.labels = uniq.length ? uniq : null
      }
    }

    await repo.save(t)
    res.json(t)
  })
)

// -------- DELETE --------
router.delete(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id

    const repo = AppDataSource.getRepository(Task)

    const t = await repo.findOne({ where: { id: id, orgId: orgId } })
    if (!t) throw AppError.notFound('Task not found')

    await repo.remove(t)
    res.status(204).end()
  })
)

// -------- COMMENTS --------
const commentBody = z.object({ body: z.string().min(1).max(10_000) })

router.get(
  '/:id/comments',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(TaskComment)
    const comments = await repo.find({ where: { taskId: id, orgId }, order: { createdAt: 'ASC' } })
    res.json({ rows: comments })
  })
)

router.post(
  '/:id/comments',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const id = req.params.id
    const { body } = commentBody.parse(req.body)
    // (optionnel) vérifier que la task est bien dans l'org
    const task = await AppDataSource.getRepository(Task).findOne({
      where: { id: id, orgId: orgId }
    })
    if (!task) throw AppError.notFound('Task not found')

    const repo = AppDataSource.getRepository(TaskComment)
    const c = repo.create({ orgId, taskId: id, authorId: userId, body })
    await repo.save(c)
    res.status(201).json(c)
  })
)

router.patch(
  '/kanban/reorder',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const { projectId, columns } = reorderSchema.parse(req.body)

    await assertProjectInOrg(projectId, orgId)

    // sécurité: toutes les tasks appartiennent à l’org + au projet
    const repo = AppDataSource.getRepository(Task)
    const allIds = [...columns.OPEN, ...columns.IN_PROGRESS, ...columns.DONE]

    if (allIds.length) {
      const rows = await repo.findBy({ id: In(allIds as any) })
      for (const r of rows) {
        if (r.orgId !== orgId || r.projectId !== projectId) {
          throw AppError.forbidden('Task not in this project/org')
        }
      }
    }

    await AppDataSource.transaction(async (tx) => {
      const R = tx.getRepository(Task)
      const apply = async (status: 'OPEN' | 'IN_PROGRESS' | 'DONE', ids: string[]) => {
        for (let i = 0; i < ids.length; i++) {
          await R.update({ id: ids[i], orgId, projectId }, { status, kanbanOrder: i + 1 })
        }
      }
      await apply('OPEN', columns.OPEN)
      await apply('IN_PROGRESS', columns.IN_PROGRESS)
      await apply('DONE', columns.DONE)
    })

    res.json({ ok: true })
  })
)

export default router
