import { Router } from 'express'
import { z } from 'zod'
import { AppDataSource } from '../config/data-source.js'
import { Client } from '../entities/Client.js'
import { Invoice, InvoiceItem } from '../entities/Invoice.js'
import { Organization } from '../entities/Organization.js'
import { Project } from '../entities/Project.js'
import {
  requireAuth,
  requireOrg,
  requireRoleAtLeast,
  requireVerifyEmail
} from '../middleware/auth.js'
import { requireFeature } from '../middleware/plan.js'
import { emailQueue } from '../queues_workers/queues/queues.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/errors.js'
import { escapeHtml } from '../utils/escapeHtml.js'
import { computeTotals } from '../utils/invoiceCalc.js'
import { htmlToPdfBuffer } from '../utils/pdf.js'
import { renderInvoiceHTML } from '../utils/renderInvoiceHTML.js'

const router = Router()

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED']).optional(),
  clientId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  q: z.string().max(100).optional() // number search
})

/** LIST */
router.get(
  '/',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const { page, pageSize, status, clientId, projectId, q } = listQuery.parse(req.query)

    const qb = AppDataSource.getRepository(Invoice)
      .createQueryBuilder('i')
      .where('i.orgId = :orgId', { orgId })

    if (status) qb.andWhere('i.status = :status', { status })
    if (clientId) qb.andWhere('i.clientId = :clientId', { clientId })
    if (projectId) qb.andWhere('i.projectId = :projectId', { projectId })
    if (q && q.trim()) qb.andWhere('i.number ILIKE :num', { num: `%${q.trim()}%` })

    qb.orderBy('i.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [rows, total] = await qb.getManyAndCount()
    res.json({ rows, total, page, pageSize })
  })
)

const itemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0).optional()
})
const upsertSchema = z.object({
  number: z.string().min(1).max(40),
  currency: z.string().length(3).default('USD'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED']).default('DRAFT'),
  clientId: z.uuid().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  terms: z.string().max(10000).nullable().optional(),
  items: z.array(itemSchema).min(1),
  taxRatePct: z.coerce.number().min(0).max(100).default(0)
})

/** CREATE */
router.post(
  '/',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const body = upsertSchema.parse(req.body)

    // validate client/project ownership if provided
    if (body.clientId) {
      const c = await AppDataSource.getRepository(Client).findOne({
        where: { id: body.clientId, orgId }
      })
      if (!c) throw AppError.badRequest('Client not found in this org')
    }
    if (body.projectId) {
      const p = await AppDataSource.getRepository(Project).findOne({
        where: { id: body.projectId, orgId }
      })
      if (!p) throw AppError.badRequest('Project not found in this org')
    }

    // compute totals
    const totals = computeTotals(
      body.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })),
      body.taxRatePct
    )
    const invRepo = AppDataSource.getRepository(Invoice)
    const itemRepo = AppDataSource.getRepository(InvoiceItem)

    const inv = invRepo.create({
      orgId,
      number: body.number.trim(),
      currency: body.currency.toUpperCase(),
      issueDate: body.issueDate,
      dueDate: body.dueDate ?? null,
      status: body.status,
      clientId: body.clientId ?? null,
      projectId: body.projectId ?? null,
      subtotal: totals.subtotal.toFixed(2),
      tax: totals.tax.toFixed(2),
      total: totals.total.toFixed(2),
      notes: body.notes?.trim() || null,
      terms: body.terms?.trim() || null
    })
    await invRepo.save(inv)

    const items = body.items.map((it, idx) =>
      itemRepo.create({
        invoiceId: inv.id,
        description: it.description.trim(),
        quantity: it.quantity.toFixed(2),
        unitPrice: it.unitPrice.toFixed(2),
        amount: (it.quantity * it.unitPrice).toFixed(2),
        sortOrder: it.sortOrder ?? idx
      })
    )
    await itemRepo.save(items)

    const withItems = await invRepo.findOne({ where: { id: inv.id }, relations: { items: true } })
    res.status(201).json(withItems)
  })
)

/** GET ONE */
router.get(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const inv = await AppDataSource.getRepository(Invoice).findOne({
      where: { id, orgId },
      relations: { items: true }
    })
    if (!inv) throw AppError.notFound('Invoice not found')
    res.json(inv)
  })
)

/** UPDATE (remplace la liste d’items) */
router.patch(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const body = upsertSchema.partial().parse(req.body)

    const invRepo = AppDataSource.getRepository(Invoice)
    const itemRepo = AppDataSource.getRepository(InvoiceItem)
    const inv = await invRepo.findOne({ where: { id, orgId }, relations: { items: true } })
    if (!inv) throw AppError.notFound('Invoice not found')

    // ownership checks
    if (body.clientId !== undefined && body.clientId !== null) {
      const c = await AppDataSource.getRepository(Client).findOne({
        where: { id: body.clientId, orgId }
      })
      if (!c) throw AppError.badRequest('Client not found in this org')
    }
    if (body.projectId !== undefined && body.projectId !== null) {
      const p = await AppDataSource.getRepository(Project).findOne({
        where: { id: body.projectId, orgId }
      })
      if (!p) throw AppError.badRequest('Project not found in this org')
    }

    if (body.number != null) inv.number = body.number.trim()
    if (body.currency != null) inv.currency = body.currency.toUpperCase()
    if (body.issueDate != null) inv.issueDate = body.issueDate
    if ('dueDate' in body) inv.dueDate = body.dueDate ?? null
    if (body.status != null) inv.status = body.status
    if ('clientId' in body) inv.clientId = body.clientId ?? null
    if ('projectId' in body) inv.projectId = body.projectId ?? null
    if ('notes' in body) inv.notes = body.notes?.trim() || null
    if ('terms' in body) inv.terms = body.terms?.trim() || null

    // if items provided, replace
    if (Array.isArray(body.items)) {
      await itemRepo.delete({ invoiceId: inv.id })
      const items = body.items.map((it, idx) =>
        itemRepo.create({
          invoiceId: inv.id,
          description: it.description.trim(),
          quantity: it.quantity.toFixed(2),
          unitPrice: it.unitPrice.toFixed(2),
          amount: (it.quantity * it.unitPrice).toFixed(2),
          sortOrder: it.sortOrder ?? idx
        })
      )
      await itemRepo.save(items)
    }

    // recompute totals if items or tax changed
    if (Array.isArray(body.items) || body['taxRatePct'] != null) {
      const currentItems = await itemRepo.find({ where: { invoiceId: inv.id } })
      const totals = computeTotals(
        currentItems.map((it) => ({
          description: it.description,
          quantity: parseFloat(it.quantity),
          unitPrice: parseFloat(it.unitPrice)
        })),
        body['taxRatePct'] ?? 0
      )
      inv.subtotal = totals.subtotal.toFixed(2)
      inv.tax = totals.tax.toFixed(2)
      inv.total = totals.total.toFixed(2)
    }

    await invRepo.save(inv)
    const withItems = await invRepo.findOne({ where: { id: inv.id }, relations: { items: true } })
    res.json(withItems)
  })
)

/** DELETE */
router.delete(
  '/:id',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Invoice)
    const inv = await repo.findOne({ where: { id, orgId } })
    if (!inv) throw AppError.notFound('Invoice not found')
    await repo.remove(inv)
    res.status(204).end()
  })
)

/** DOWNLOAD PDF (FREE OK) */
router.get(
  '/:id/pdf',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const repo = AppDataSource.getRepository(Invoice)
    const inv = await repo.findOne({ where: { id, orgId }, relations: { items: true } })
    if (!inv) throw AppError.notFound('Invoice not found')

    const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
    if (!org) throw AppError.notFound('Organization not found')

    const client = inv.clientId
      ? await AppDataSource.getRepository(Client).findOne({ where: { id: inv.clientId, orgId } })
      : null

    const html = renderInvoiceHTML({ invoice: inv as any, org, client })
    const pdf = await htmlToPdfBuffer(html, { format: 'A4' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="invoice-${inv.number}.pdf"`)
    res.send(pdf)
  })
)

/** SEND via email (PRO feature) */
router.post(
  '/:id/send',
  requireAuth,
  requireVerifyEmail,
  requireOrg,
  requireRoleAtLeast('MEMBER'),
  requireFeature('invoice_email'),
  asyncHandler(async (req, res) => {
    const orgId = (req as any).orgId as string
    const id = req.params.id
    const schema = z.object({
      to: z.string().email().optional(), // par défaut client.email
      subject: z.string().min(1).max(200).optional(),
      message: z.string().max(10000).optional()
    })
    const { to, subject, message } = schema.parse(req.body)

    const repo = AppDataSource.getRepository(Invoice)
    const inv = await repo.findOne({ where: { id, orgId }, relations: { items: true } })
    if (!inv) throw AppError.notFound('Invoice not found')

    const org = await AppDataSource.getRepository(Organization).findOne({ where: { id: orgId } })
    const client = inv.clientId
      ? await AppDataSource.getRepository(Client).findOne({ where: { id: inv.clientId, orgId } })
      : null

    const recipient = to || client?.email
    if (!recipient) throw AppError.badRequest('No recipient email')

    const html = renderInvoiceHTML({ invoice: inv as any, org: org!, client: client ?? null })
    const pdf = await htmlToPdfBuffer(html, { format: 'A4' })
    const pdfBase64 = Buffer.from(pdf).toString('base64')

    // enqueue email with attachment
    await emailQueue.add('sendInvoiceEmail', {
      to: recipient,
      subject: subject || `Invoice ${inv.number}`,
      text: message || `Please find attached invoice ${inv.number}.`,
      html: message ? `<p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` : undefined,
      attachment: {
        filename: `invoice-${inv.number}.pdf`,
        contentBase64: pdfBase64,
        contentType: 'application/pdf'
      }
    })

    // update status if draft
    if (inv.status === 'DRAFT') {
      inv.status = 'SENT'
      await repo.save(inv)
    }
    res.json({ ok: true })
  })
)

export default router
