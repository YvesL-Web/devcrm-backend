import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { TimeEntry } from '../entities/TimeEntry.js'
import { requireAuth, requireOrg } from '../middleware/auth.js'

const router = Router()

router.post('/projects/:projectId/time', requireAuth, requireOrg, async (req, res) => {
  const schema = z.object({
    taskId: z.uuid().optional(),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
    kind: z.enum(['DEV', 'CONSULT']).default('DEV')
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const entry = AppDataSource.getRepository(TimeEntry).create({
    projectId: req.params.projectId,
    userId: (req as any).userId,
    ...parsed.data
  })
  await AppDataSource.getRepository(TimeEntry).save(entry)
  return res.json({ timeEntry: entry })
})

export default router
