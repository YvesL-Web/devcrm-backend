import { randomUUID } from 'crypto'
import { Router } from 'express'
import { createReadStream, statSync, unlinkSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { AppDataSource } from '../config/data-source.js'
import { buildStorageKey, storagePathFor } from '../config/uploads.js'
import { TaskAttachment } from '../entities/TaskAttachment.js'
import { TaskEvent } from '../entities/TaskEvent.js'
import {
  requireAuth,
  requireOrg,
  requireRoleAtLeast,
  requireVerifyEmail
} from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'
import { ensureDir } from '../utils/fsx.js'
import { loadTaskInOrg } from './_taskAccess.js'

const router = Router()

router.get(
  '/:taskId/attachments',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const taskId = req.params.taskId
    await loadTaskInOrg(taskId, orgId)

    const rows = await AppDataSource.getRepository(TaskAttachment).find({
      where: { orgId, taskId },
      order: { createdAt: 'ASC' }
    })
    res.json({ rows })
  })
)

router.post(
  '/:taskId/attachments',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const taskId = req.params.taskId
    await loadTaskInOrg(taskId, orgId)

    const files = (req.files as Express.Multer.File[]) || []
    if (!files.length) throw AppError.badRequest('No files uploaded')

    const repo = AppDataSource.getRepository(TaskAttachment)
    const evRepo = AppDataSource.getRepository(TaskEvent)
    const created: TaskAttachment[] = []

    for (const f of files) {
      const id = randomUUID()
      const storageKey = buildStorageKey({ orgId, taskId, id, filename: f.originalname })
      const abs = storagePathFor(storageKey)
      ensureDir(dirname(abs))
      writeFileSync(abs, f.buffer)

      const att = repo.create({
        id,
        orgId,
        taskId,
        uploaderId: userId,
        filename: f.originalname,
        mimeType: f.mimetype,
        size: String(f.size),
        storageKey
      })
      await repo.save(att)
      created.push(att)

      await evRepo.save(
        evRepo.create({
          orgId,
          taskId,
          actorId: userId,
          type: 'ATTACHMENT_ADDED',
          data: { filename: att.filename, id: att.id, mimeType: att.mimeType, size: att.size }
        })
      )
    }
    res.status(201).json({ rows: created })
  })
)

router.get(
  '/attachments/:id/download',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const inline = String(req.query.inline || '') === '1'

    const repo = AppDataSource.getRepository(TaskAttachment)
    const att = await repo.findOne({ where: { id: id, orgId } })
    if (!att) throw AppError.notFound('Attachment not found')

    const p = storagePathFor(att.storageKey)
    const st = statSync(p)
    res.setHeader('Content-Type', att.mimeType)
    res.setHeader('Content-Length', String(st.size))
    const disposition = inline ? 'inline' : 'attachment'
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(att.filename)}"`
    )
    createReadStream(p).pipe(res)
  })
)

router.delete(
  '/attachments/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const userId = (req as any).userId as string
    const id = req.params.id

    const repo = AppDataSource.getRepository(TaskAttachment)
    const att = await repo.findOne({ where: { id, orgId } })
    if (!att) throw AppError.notFound('Attachment not found')
    if (att.uploaderId !== userId)
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the uploader' } })

    try {
      unlinkSync(storagePathFor(att.storageKey))
    } catch {}
    await repo.remove(att)

    await AppDataSource.getRepository(TaskEvent).save(
      AppDataSource.getRepository(TaskEvent).create({
        orgId,
        taskId: att.taskId,
        actorId: userId,
        type: 'ATTACHMENT_REMOVED',
        data: { filename: att.filename, id: att.id }
      })
    )

    res.status(204).end()
  })
)

export default router
