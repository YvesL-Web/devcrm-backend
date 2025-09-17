import { Router } from 'express'
import { AppDataSource } from '../config/data-source.js'
import { ChangelogItem } from '../entities/ChangelogItem.js'
import { Invoice } from '../entities/Invoice.js'
import { Organization } from '../entities/Organization.js'
import { Project } from '../entities/Project.js'
import { Release } from '../entities/Release.js'
import { renderInvoiceHtml } from '../utils/invoiceHtml.js'
import { htmlToPdfBuffer } from '../utils/pdf.js'
import { renderPortalHtml } from '../utils/portalHtml.js'
import { signInvoiceToken, verifyInvoiceToken } from '../utils/portalToken.js'

const router = Router()

/**
 * GET /p/:slug   → Portal public (HTML par défaut, JSON si ?format=json ou Accept: application/json)
 */
router.get('/p/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug
    const projRepo = AppDataSource.getRepository(Project)
    const orgRepo = AppDataSource.getRepository(Organization)
    const relRepo = AppDataSource.getRepository(Release)
    const itemRepo = AppDataSource.getRepository(ChangelogItem)
    const invRepo = AppDataSource.getRepository(Invoice)

    const project = await projRepo.findOne({ where: { portalSlug: slug } })
    if (!project || !project.portalPublic) return res.status(404).send('Not found')

    const org = await orgRepo.findOne({ where: { id: project.orgId } })
    if (!org) return res.status(404).send('Not found')

    // Changelog
    let releases: Array<{ release: Release; items: ChangelogItem[] }> = []
    if (project.portalShowChangelog) {
      const rels = await relRepo.find({
        where: { projectId: project.id },
        order: { createdAt: 'DESC' as any },
        take: 20
      })
      releases = await Promise.all(
        rels.map(async (r) => ({
          release: r,
          items: await itemRepo.find({ where: { releaseId: r.id } })
        }))
      )
    }

    // Invoices (SENT/PAID) for project client (if any)
    let invoices: Array<{
      id: string
      number: string
      total: number
      currency: string
      status: string
      issuedAt?: string
      pdfUrl?: string
    }> = []
    if (project.portalShowInvoices && project.clientId) {
      const invs = await invRepo.find({
        where: { orgId: project.orgId, clientId: project.clientId },
        order: { createdAt: 'DESC' as any },
        take: 50
      })
      invoices = invs
        .filter((i) => i.status === 'SENT' || i.status === 'PAID')
        .map((i) => ({
          id: i.id,
          number: i.number,
          total: i.total,
          currency: i.currency,
          status: i.status,
          issuedAt: i.issuedAt || undefined,
          // lien PDF signé (expirant) – stateless
          pdfUrl: `${process.env.APP_URL}/p/invoice/${i.id}/pdf?t=${encodeURIComponent(
            signInvoiceToken(project.orgId, i.id)
          )}`
        }))
    }

    const data = { org, project, releases, invoices }

    const wantsJson =
      req.query.format === 'json' || (req.headers.accept || '').includes('application/json')
    if (wantsJson) return res.json(data)

    const html = renderPortalHtml(data)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(html)
  } catch (e) {
    next(e)
  }
})

/**
 * GET /p/invoice/:id/pdf?t=<token>  → PDF public avec token signé
 */
router.get('/p/invoice/:id/pdf', async (req, res, next) => {
  try {
    const token = String(req.query.t || '')
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const payload = verifyInvoiceToken(token)
    const invoiceId = req.params.id
    if (payload.invoiceId !== invoiceId) return res.status(403).json({ error: 'Invalid token' })

    const invRepo = AppDataSource.getRepository(Invoice)
    const inv = await invRepo.findOne({ where: { id: invoiceId } })
    if (!inv || inv.orgId !== payload.orgId)
      return res.status(404).json({ error: 'Invoice not found' })

    const { html, fileName } = await renderInvoiceHtml(invoiceId)
    const buf = await htmlToPdfBuffer(html)

    const dl = (req.query.dl ?? '0') === '1'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${dl ? 'attachment' : 'inline'}; filename="${fileName}"`)
    return res.send(buf)
  } catch (e) {
    next(e)
  }
})

export default router
