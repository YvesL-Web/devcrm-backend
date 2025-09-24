import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { env } from '../config/env.js'
import { OrgMember } from '../entities/OrgMember.js'
import { Project } from '../entities/Project.js'
import { Task } from '../entities/Task.js'
import { TaskComment } from '../entities/TaskComment.js'
import { TaskCommentMention } from '../entities/TaskCommentMention.js'
import { TaskEvent } from '../entities/TaskEvent.js'
import { User } from '../entities/User.js'
import {
  requireAuth,
  requireOrg,
  requireRoleAtLeast,
  requireVerifyEmail
} from '../middleware/auth.js'
import { emailQueue } from '../queues_workers/queues/queues.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'
import { extractMentionEmails } from '../utils/mentions.js'
import { loadTaskInOrg } from './_taskAccess.js'

const router = Router()

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
})

/** LIST */
router.get(
  '/:taskId/comments',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const taskId = req.params.taskId
    const { page, pageSize } = listQuery.parse(req.query)
    await loadTaskInOrg(taskId, orgId)

    const qb = AppDataSource.getRepository(TaskComment)
      .createQueryBuilder('c')
      .where('c.orgId = :orgId AND c.taskId = :taskId', { orgId, taskId })
      .orderBy('c.createdAt', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [rows, total] = await qb.getManyAndCount()
    res.json({ rows, total, page, pageSize })
  })
)

const createBody = z.object({ body: z.string().min(1).max(10000) })

/** CREATE */
router.post(
  '/:taskId/comments',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const taskId = req.params.taskId
    const { body } = createBody.parse(req.body)

    const task = await AppDataSource.getRepository(Task).findOne({ where: { id: taskId, orgId } })
    if (!task) throw AppError.notFound('Task not found')
    const project = await AppDataSource.getRepository(Project).findOne({
      where: { id: task.projectId, orgId }
    })
    const author = await AppDataSource.getRepository(User).findOne({ where: { id: userId } })

    const commentRepo = AppDataSource.getRepository(TaskComment)
    const comment = commentRepo.create({ orgId, taskId, authorId: userId, body, editedAt: null })
    await commentRepo.save(comment)

    // Event: COMMENT_ADDED
    const evRepo = AppDataSource.getRepository(TaskEvent)
    await evRepo.save(
      evRepo.create({
        orgId,
        taskId,
        actorId: userId,
        type: 'COMMENT_ADDED',
        data: { body: comment.body }
      })
    )

    // Mentions
    const emails = extractMentionEmails(body)
    if (emails.length) {
      const users = await AppDataSource.getRepository(User).find({
        where: emails.map((e) => ({ email: e }))
      })
      const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]))
      const members = await AppDataSource.getRepository(OrgMember).find({ where: { orgId } })
      const memberIds = new Set(members.map((m) => m.userId))
      const mentionsRepo = AppDataSource.getRepository(TaskCommentMention)

      for (const email of emails) {
        const u = userByEmail.get(email.toLowerCase())
        if (!u) continue
        if (u.id === userId) continue
        if (!memberIds.has(u.id)) continue

        await mentionsRepo.save(
          mentionsRepo.create({
            orgId,
            taskId,
            commentId: comment.id,
            mentionedUserId: u.id,
            createdAt: new Date(),
            notifiedAt: null
          })
        )

        const linkUrl = `${env.FRONTEND_URL}/projects/${task.projectId}?taskId=${task.id}`
        await emailQueue.add('sendCommentMentionEmail', {
          to: email,
          authorName: author?.name || 'Someone',
          taskTitle: task.title,
          projectName: project?.name,
          commentBody: body,
          linkUrl
        })
      }
    }

    res.status(201).json(comment)
  })
)

/** UPDATE (author only) */
router.patch(
  '/:taskId/comments/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const taskId = req.params.taskId
    const id = req.params.id

    const repo = AppDataSource.getRepository(TaskComment)
    const c = await repo.findOne({ where: { id, orgId, taskId } })
    if (!c) throw AppError.notFound('Comment not found')
    if (c.authorId !== userId)
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the author' } })

    const schema = z.object({ body: z.string().min(1).max(10000) })
    const { body } = schema.parse(req.body)
    c.body = body
    c.editedAt = new Date()
    await repo.save(c)

    // Event: COMMENT_ADDED (edit not logged by défaut, on peut créer COMMENT_EDITED si tu veux)
    res.json(c)
  })
)

/** DELETE (author only) */
router.delete(
  '/:taskId/comments/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const taskId = req.params.taskId
    const id = req.params.id

    const repo = AppDataSource.getRepository(TaskComment)
    const c = await repo.findOne({ where: { id, orgId, taskId } })
    if (!c) throw AppError.notFound('Comment not found')
    if (c.authorId !== userId)
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the author' } })

    await repo.remove(c)
    res.status(204).end()
  })
)

export default router
