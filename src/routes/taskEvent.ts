import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { TaskEvent } from '../entities/TaskEvent.js'
import { requireAuth, requireOrg, requireVerifyEmail } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { loadTaskInOrg } from './_taskAccess.js'

const router = Router()

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
})

router.get(
  '/:taskId/events',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const taskId = req.params.taskId
    const { page, pageSize } = listQuery.parse(req.query)
    await loadTaskInOrg(taskId, orgId)

    const qb = AppDataSource.getRepository(TaskEvent)
      .createQueryBuilder('e')
      .where('e.orgId = :orgId AND e.taskId = :taskId', { orgId, taskId })
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [rows, total] = await qb.getManyAndCount()
    res.json({ rows, total, page, pageSize })
  })
)

export default router
