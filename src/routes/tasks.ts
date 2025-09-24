import { Router } from 'express'
import { In } from 'typeorm'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { Project } from '../entities/Project.js'
import { Task } from '../entities/Task.js'
import { TaskEvent } from '../entities/TaskEvent.js'
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

// -------- LIST --------
const listQuery = z.object({
  projectId: z.uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  q: z.string().optional(),
  assigneeId: z.uuid().optional(),
  label: z.string().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'kanbanOrder']).optional(),
  order: z.enum(['ASC', 'DESC']).default('ASC')
})

router.get(
  '/',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const { projectId, status, q, assigneeId, label, page, pageSize, sort, order } =
      listQuery.parse(req.query)

    const repo = AppDataSource.getRepository(Task)
    const qb = repo.createQueryBuilder('t').where('t.orgId = :orgId', { orgId })

    if (projectId) qb.andWhere('t.projectId = :projectId', { projectId })
    if (status) qb.andWhere('t.status = :status', { status })
    if (q) qb.andWhere('(t.title ILIKE :q OR t.description ILIKE :q)', { q: `%${q}%` })
    if (assigneeId) qb.andWhere('t.assigneeId = :assigneeId', { assigneeId })
    if (label) qb.andWhere(':label = ANY(t.labels)', { label })

    if (sort) qb.orderBy(`t.${sort}`, order)
    else qb.orderBy('t.kanbanOrder', 'ASC')

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

    // Event
    await AppDataSource.getRepository(TaskEvent).save(
      AppDataSource.getRepository(TaskEvent).create({
        orgId: orgId,
        taskId: t.id,
        actorId: userId,
        type: 'TASK_CREATED',
        data: { title: t.title, priority: t.priority }
      })
    )

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
    const events = AppDataSource.getRepository(TaskEvent)

    const t = await repo.findOne({ where: { id, orgId } })
    if (!t) throw AppError.notFound('Task not found')

    // ---- Gating assignee en FREE (assigner à soi-même OK, à autrui => PRO mini)
    if (typeof data.assigneeId !== 'undefined') {
      const org = await getOrgOrThrow(orgId)
      const canAssignOthers = Capabilities.CAN_ASSIGN_OTHERS(org.plan as any)
      if (!canAssignOthers && data.assigneeId && data.assigneeId !== userId) {
        throw AppError.forbidden('Assigning tasks to other members requires PRO plan')
      }
    }

    // ---- Capture avant/après (pour events + doneAt)
    const before = {
      status: t.status,
      assigneeId: t.assigneeId,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      labels: t.labels
    }

    // ---- Appliquer les champs simples
    if (typeof data.title !== 'undefined') t.title = data.title
    if (typeof data.description !== 'undefined') t.description = data.description
    if (typeof data.priority !== 'undefined') t.priority = data.priority
    if (typeof data.assigneeId !== 'undefined') t.assigneeId = data.assigneeId ?? null
    if (typeof data.githubIssueUrl !== 'undefined') t.githubIssueUrl = data.githubIssueUrl ?? null
    if (typeof data.dueDate !== 'undefined') t.dueDate = data.dueDate ?? null

    // ---- Labels : l’entité utilise un tableau non-null => [] si null/undefined
    if ('labels' in data) {
      if (data.labels == null) {
        t.labels = []
      } else {
        const uniq = Array.from(new Set(data.labels.map((s) => s.trim()).filter(Boolean)))
        t.labels = uniq
      }
    }

    // ---- Status + kanbanOrder + doneAt
    type Status = 'OPEN' | 'IN_PROGRESS' | 'DONE'

    const prevStatus: Status = t.status as Status
    const nextStatus: Status = (data.status ?? t.status) as Status

    if (typeof data.status !== 'undefined' && nextStatus !== prevStatus) {
      t.status = nextStatus

      // push à la fin de la nouvelle colonne
      const last = await repo
        .createQueryBuilder('x')
        .where('x.orgId = :orgId AND x.projectId = :projectId AND x.status = :status', {
          orgId,
          projectId: t.projectId,
          status: nextStatus
        })
        .orderBy('x.kanbanOrder', 'DESC')
        .getOne()
      t.kanbanOrder = (last?.kanbanOrder ?? 0) + 1

      // maintenir doneAt sans faire râler TS
      if (nextStatus === 'DONE') {
        t.doneAt = new Date()
      } else if (prevStatus === 'DONE') {
        t.doneAt = null
      }

      // Event: STATUS_CHANGED
      await events.save(
        events.create({
          orgId,
          taskId: t.id,
          actorId: userId,
          type: 'STATUS_CHANGED',
          data: { from: prevStatus, to: nextStatus }
        })
      )
    }

    // ---- Event: ASSIGNEE_CHANGED
    if (typeof data.assigneeId !== 'undefined' && data.assigneeId !== before.assigneeId) {
      await events.save(
        events.create({
          orgId,
          taskId: t.id,
          actorId: userId,
          type: 'ASSIGNEE_CHANGED',
          data: { from: before.assigneeId, to: data.assigneeId ?? null }
        })
      )
    }

    // ---- Optionnel: TASK_UPDATED si d’autres champs ont changé
    const otherChanged =
      (typeof data.title !== 'undefined' && data.title !== before.title) ||
      (typeof data.priority !== 'undefined' && data.priority !== before.priority) ||
      (typeof data.dueDate !== 'undefined' &&
        (data.dueDate ?? null) !== (before.dueDate ?? null)) ||
      ('labels' in data &&
        JSON.stringify(t.labels || []) !== JSON.stringify(before.labels || [])) ||
      typeof data.description !== 'undefined'

    if (otherChanged) {
      await events.save(
        events.create({
          orgId,
          taskId: t.id,
          actorId: userId,
          type: 'TASK_UPDATED',
          data: {
            title: t.title,
            priority: t.priority,
            dueDate: t.dueDate,
            labels: t.labels
          }
        })
      )
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

// -------- KANBAN REORDER --------
const reorderSchema = z.object({
  projectId: z.uuid(),
  columns: z.object({
    OPEN: z.array(z.uuid()),
    IN_PROGRESS: z.array(z.uuid()),
    DONE: z.array(z.uuid())
  })
})

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

/** KANBAN reorder: body.updates: [{ id, status, kanbanOrder }] */
// const reorderBody = z.object({
//   updates: z.array(z.object({
//     id: z.uuid(),
//     status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']),
//     kanbanOrder: z.number().int().min(0),
//   })).min(1),
//   projectId: z.string().uuid(),
// })

// router.patch(
//   '/kanban/reorder',
//   requireAuth, requireVerifyEmail, requireOrg, requireRoleAtLeast('MEMBER'),
//   asyncHandler(async (req, res) => {
//     const orgId = (req as any).orgId as string
//     const { updates, projectId } = reorderBody.parse(req.body)
//     const ids = updates.map(u => u.id)

//     const repo = AppDataSource.getRepository(Task)
//     const tasks = await repo.find({ where: { orgId, projectId, id: In(ids) } })
//     const byId = new Map(tasks.map(t => [t.id, t]))

//     for (const u of updates) {
//       const t = byId.get(u.id)
//       if (!t) continue
//       const prev = t.status
//       t.status = u.status
//       t.kanbanOrder = u.kanbanOrder
//       if (prev !== t.status) {
//         if (t.status === 'DONE') t.doneAt = new Date()
//         else if (prev === 'DONE' && t.status !== 'DONE') t.doneAt = null
//       }
//     }
//     await repo.save([...byId.values()])
//     res.json({ ok: true })
//   })
// )
