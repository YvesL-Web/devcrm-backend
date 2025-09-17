import { Router } from 'express'
import { In } from 'typeorm'
import { AppDataSource } from '../config/data-source.js'
import { ChangelogItem } from '../entities/ChangelogItem.js'
import { Project } from '../entities/Project.js'
import { Release } from '../entities/Release.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'

const router = Router()

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug
    const repo = AppDataSource.getRepository(Project)
    const p = await repo.findOne({ where: { portalSlug: slug } })
    if (!p) throw AppError.notFound('Project not found')
    if (!p.portalPublic) throw AppError.forbidden('Project portal is private')

    const payload: any = {
      project: {
        name: p.name,
        portalWelcome: p.portalWelcome,
        portalShowChangelog: p.portalShowChangelog,
        portalShowInvoices: p.portalShowInvoices
      }
    }

    if (p.portalShowChangelog) {
      const releases = await AppDataSource.getRepository(Release)
        .createQueryBuilder('r')
        .where('r.projectId = :projectId', { projectId: p.id })
        .orderBy('r.createdAt', 'DESC')
        .getMany()
      const items = releases.length
        ? await AppDataSource.getRepository(ChangelogItem).find({
            where: { releaseId: In(releases.map((r) => r.id) as any) }
          })
        : []
      const byRel = items.reduce<Record<string, ChangelogItem[]>>((acc, it) => {
        ;(acc[it.releaseId] ||= []).push(it)
        return acc
      }, {})
      payload.releases = releases.map((r) => ({ ...r, items: byRel[r.id] || [] }))
    }

    res.json(payload)
  })
)

export default router
