import { Router } from 'express'
import { In } from 'typeorm'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { ChangelogItem } from '../entities/ChangelogItem.js'
import { Project } from '../entities/Project.js'
import { Release } from '../entities/Release.js'
import { requireAuth, requireOrg, requireRoleAtLeast } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'

const router = Router()

async function assertProjectInOrg(projectId: string, orgId: string) {
  const p = await AppDataSource.getRepository(Project).findOne({ where: { id: projectId, orgId } })
  if (!p) throw AppError.forbidden('Project not in your organization')
}

// ----- List by project -----
const listQuery = z.object({
  projectId: z.uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

router.get(
  '/',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const { projectId, page, pageSize } = listQuery.parse(req.query)
    await assertProjectInOrg(projectId, orgId)

    const repo = AppDataSource.getRepository(Release)
    const [rows, total] = await repo
      .createQueryBuilder('r')
      .where('r.projectId = :projectId', { projectId })
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // attach items (simple pass)
    const ids = rows.map((r) => r.id)
    const items = ids.length
      ? await AppDataSource.getRepository(ChangelogItem).find({ where: { releaseId: In(ids) } })
      : []
    const byRel = items.reduce<Record<string, ChangelogItem[]>>((acc, it) => {
      ;(acc[it.releaseId] ||= []).push(it)
      return acc
    }, {})
    res.json({ rows: rows.map((r) => ({ ...r, items: byRel[r.id] || [] })), total, page, pageSize })
  })
)

// ----- Create release -----
const createBody = z.object({
  projectId: z.uuid(),
  version: z.string().max(50).optional(),
  title: z.string().min(1).max(200),
  bodyMd: z.string().min(1).max(50_000)
})
router.post(
  '/',
  requireAuth,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const data = createBody.parse(req.body)
    await assertProjectInOrg(data.projectId, orgId)

    const repo = AppDataSource.getRepository(Release)
    const r = repo.create(data)
    await repo.save(r)
    res.status(201).json(r)
  })
)

// ----- Update / Delete -----
const updateBody = z.object({
  version: z.string().max(50).nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  bodyMd: z.string().min(1).max(50_000).optional()
})

router.patch(
  '/:id',
  requireAuth,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Release)
    const r = await repo.findOne({ where: { id } })
    if (!r) throw AppError.notFound('Release not found')

    // ensure release's project is in org
    await assertProjectInOrg(r.projectId, orgId)

    Object.assign(r, updateBody.parse(req.body))
    await repo.save(r)
    res.json(r)
  })
)

router.delete(
  '/:id',
  requireAuth,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Release)
    const r = await repo.findOne({ where: { id } })
    if (!r) throw AppError.notFound('Release not found')
    await assertProjectInOrg(r.projectId, orgId)
    await repo.remove(r)
    res.status(204).end()
  })
)

// ----- Changelog items -----
const itemBody = z.object({
  type: z.enum(['FEATURE', 'FIX', 'CHORE']),
  title: z.string().min(1).max(200),
  url: z.url().nullable().optional()
})

router.get(
  '/:id/items',
  requireAuth,
  requireOrg,
  asyncHandler(async (req, res) => {
    const id = req.params.id
    const repoR = AppDataSource.getRepository(Release)
    const r = await repoR.findOne({ where: { id } })
    if (!r) throw AppError.notFound('Release not found')
    const items = await AppDataSource.getRepository(ChangelogItem).find({
      where: { releaseId: id }
    })
    res.json({ rows: items })
  })
)

router.post(
  '/:id/items',
  requireAuth,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repoR = AppDataSource.getRepository(Release)
    const r = await repoR.findOne({ where: { id } })
    if (!r) throw AppError.notFound('Release not found')
    await assertProjectInOrg(r.projectId, orgId)

    const payload = itemBody.parse(req.body)
    const repo = AppDataSource.getRepository(ChangelogItem)
    const it = repo.create({ releaseId: id, ...payload })
    await repo.save(it)
    res.status(201).json(it)
  })
)

router.patch(
  '/items/:itemId',
  requireAuth,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const itemId = req.params.itemId
    const repo = AppDataSource.getRepository(ChangelogItem)
    const it = await repo.findOne({ where: { id: itemId } })
    if (!it) throw AppError.notFound('Item not found')

    const rel = await AppDataSource.getRepository(Release).findOne({ where: { id: it.releaseId } })
    if (!rel) throw AppError.notFound('Release not found')
    await assertProjectInOrg(rel.projectId, orgId)

    Object.assign(it, itemBody.partial().parse(req.body))
    await repo.save(it)
    res.json(it)
  })
)

router.delete(
  '/items/:itemId',
  requireAuth,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const itemId = req.params.itemId
    const repo = AppDataSource.getRepository(ChangelogItem)
    const it = await repo.findOne({ where: { id: itemId } })
    if (!it) throw AppError.notFound('Item not found')
    const rel = await AppDataSource.getRepository(Release).findOne({ where: { id: it.releaseId } })
    if (!rel) throw AppError.notFound('Release not found')
    await assertProjectInOrg(rel.projectId, orgId)

    await repo.remove(it)
    res.status(204).end()
  })
)

export default router
