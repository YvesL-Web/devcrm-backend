import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { ChangelogItem } from '../entities/ChangelogItem.js'
import { Project } from '../entities/Project.js'
import { Release } from '../entities/Release.js'
import { requireAuth, requireOrg } from '../middleware/auth.js'
import { requireFeature } from '../middleware/plan.js'
import {
  buildBodyMd,
  classify, // 🔹 use our typed helper
  DraftItem,
  ghCompare,
  ghGET,
  ghSearchPRs,
  parseRepoUrl
} from '../utils/github.js'

const router = Router()

const importSchema = z.object({
  projectId: z.uuid(),
  repoUrl: z.url(),
  mode: z.enum(['range', 'compare']).default('range'),
  // range mode
  since: z.date().optional(),
  until: z.date().optional(),
  // compare mode
  base: z.string().optional(),
  head: z.string().optional(),
  // options
  save: z.boolean().default(false),
  githubToken: z.string().optional(), // optional override (else env.GITHUB_TOKEN)
  title: z.string().optional(),
  version: z.string().optional()
})

type GitHubPR = {
  title: string
  html_url: string
  labels?: Array<{ name: string } | string>
}

router.post(
  '/integrations/github/import',
  requireAuth,
  requireOrg,
  requireFeature('github_import'), // PRO+
  async (req, res) => {
    const parsed = importSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const {
      projectId,
      repoUrl,
      mode,
      since,
      until,
      base,
      head,
      save,
      githubToken,
      title,
      version
    } = parsed.data

    // verify project belongs to current org
    const project = await AppDataSource.getRepository(Project).findOne({ where: { id: projectId } })
    if (!project || project.orgId !== (req as any).orgId)
      return res.status(404).json({ error: 'Project not found' })

    const { owner, repo } = parseRepoUrl(repoUrl)

    let items: DraftItem[] = []

    if (mode === 'range') {
      const sinceISO =
        (since instanceof Date ? since.toISOString() : since) ||
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString() // last 14d
      const untilISO =
        (until instanceof Date ? until.toISOString() : until) || new Date().toISOString()
      const prs = await ghSearchPRs(owner, repo, sinceISO, untilISO, githubToken)
      for (const pr of prs) {
        const labels = (pr.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name))
        const type = classify(pr.title, labels)
        items.push({ type, title: pr.title, url: pr.html_url })
      }
    } else {
      if (!base || !head)
        return res.status(400).json({ error: 'base and head required for compare mode' })
      const cmp = await ghCompare(owner, repo, base, head, githubToken)

      // try to extract PR numbers from commit messages like "Merge pull request #123"
      const prNums = new Set<number>()
      for (const c of (cmp.commits || []) as any[]) {
        const m = /#(\d+)/.exec(c.commit?.message ?? '')
        if (m) prNums.add(Number(m[1]))
      }

      if (prNums.size === 0) {
        // fallback: treat commits as chores
        for (const c of (cmp.commits || []) as any[]) {
          const msg = (c.commit?.message ?? '').split('\n')[0]
          items.push({ type: classify(msg), title: msg, url: c.html_url })
        }
      } else {
        // fetch each PR using ghGET (typed), not fetch()
        for (const num of prNums) {
          const pr = await ghGET<GitHubPR>(`/repos/${owner}/${repo}/pulls/${num}`, githubToken)
          const labels = (pr.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name))
          const type = classify(pr.title, labels)
          items.push({ type, title: pr.title, url: pr.html_url })
        }
      }
    }

    const groups: Record<'FEATURE' | 'FIX' | 'CHORE', DraftItem[]> = {
      FEATURE: [],
      FIX: [],
      CHORE: []
    }
    for (const it of items) groups[it.type].push(it)

    const bodyMd = buildBodyMd(groups)
    const defaultTitle = title || `Release ${new Date().toISOString().slice(0, 10)}`

    const draft = { projectId, title: defaultTitle, version: version || undefined, bodyMd, items }

    if (!save) return res.json({ draft })

    // persist release + items
    const relRepo = AppDataSource.getRepository(Release)
    const rel = relRepo.create({
      projectId,
      title: draft.title,
      version: draft.version,
      bodyMd: draft.bodyMd
    })
    await relRepo.save(rel)

    const itemRepo = AppDataSource.getRepository(ChangelogItem)
    for (const it of draft.items) {
      await itemRepo.save(
        itemRepo.create({ releaseId: rel.id, type: it.type, title: it.title, url: it.url })
      )
    }

    return res.json({ releaseId: rel.id })
  }
)

// placeholders
router.post('/integrations/github/connect', (_req, res) =>
  res.status(501).json({ error: 'OAuth planned later' })
)
router.post('/webhooks/github', (_req, res) =>
  res.status(501).json({ error: 'Webhook handling planned later' })
)

export default router
