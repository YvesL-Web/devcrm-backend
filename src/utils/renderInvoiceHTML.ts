import type { Client } from '../entities/Client'
import type { Invoice } from '../entities/Invoice'
import type { Organization } from '../entities/Organization'

export function renderInvoiceHTML(params: {
  invoice: Invoice & {
    items: { description: string; quantity: string; unitPrice: string; amount: string }[]
  }
  org: Organization
  client: Client | null
}) {
  const { invoice, org, client } = params
  const money = (s: string | number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(
      typeof s === 'number' ? s : parseFloat(s || '0')
    )

  const addr = (c?: Client | null) =>
    c
      ? [
          c.company,
          c.name,
          c.addressLine1,
          c.addressLine2,
          [c.postalCode, c.city].filter(Boolean).join(' '),
          c.country
        ]
          .filter(Boolean)
          .join('<br/>')
      : '—'

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${invoice.number}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Helvetica Neue", "Apple Color Emoji", "Segoe UI Emoji"; color:#0f172a; }
  .wrap { max-width: 800px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 24px; margin: 0; }
  .muted { color:#64748b }
  table { width:100%; border-collapse: collapse; }
  th, td { padding: 10px 8px; }
  th { background:#f8fafc; text-align:left; font-size:13px; color:#475569; border-bottom:1px solid #e2e8f0; }
  td { border-bottom:1px solid #e2e8f0; font-size:14px; }
  .totals td { border:none; }
  .box { border:1px solid #e2e8f0; border-radius:12px; padding:12px; }
</style>
</head>
<body>
  <div class="wrap">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
      <div>
        <h1>Invoice ${invoice.number}</h1>
        <div class="muted" style="margin-top:6px;">${org.name}</div>
      </div>
      <div class="box" style="min-width: 260px;">
        <div><strong>Issue date:</strong> ${invoice.issueDate}</div>
        <div><strong>Due date:</strong> ${invoice.dueDate ?? '—'}</div>
        <div><strong>Status:</strong> ${invoice.status}</div>
        <div><strong>Currency:</strong> ${invoice.currency}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px;">
      <div class="box">
        <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.04em;">Bill from</div>
        <div style="margin-top:6px;">
          <strong>${org.name}</strong><br/>
          <!-- ajoute plus tard l’adresse org si tu veux -->
        </div>
      </div>
      <div class="box">
        <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.04em;">Bill to</div>
        <div style="margin-top:6px;">${addr(client ?? null)}</div>
      </div>
    </div>

    <div style="margin-top:16px;">
      <table>
        <thead>
          <tr><th>Description</th><th style="width:80px;">Qty</th><th style="width:120px;">Unit</th><th style="width:120px;">Amount</th></tr>
        </thead>
        <tbody>
          ${invoice.items
            .sort((a, b) => Number(a['sortOrder'] ?? 0) - Number(b['sortOrder'] ?? 0))
            .map(
              (it) => `<tr>
                <td>${escapeHtml(it.description)}</td>
                <td>${Number(it.quantity)}</td>
                <td>${money(it.unitPrice)}</td>
                <td>${money(it.amount)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div style="display:grid; grid-template-columns:1fr 280px; gap:16px; margin-top:16px; align-items:flex-start;">
      <div class="box">
        <div><strong>Notes</strong></div>
        <div style="margin-top:6px;">${invoice.notes ? escapeHtml(invoice.notes) : '—'}</div>
        <div style="margin-top:12px;"><strong>Terms</strong></div>
        <div style="margin-top:6px;">${invoice.terms ? escapeHtml(invoice.terms) : '—'}</div>
      </div>
      <div class="box">
        <table class="totals">
          <tbody>
            <tr><td>Subtotal</td><td style="text-align:right;">${money(invoice.subtotal)}</td></tr>
            <tr><td>Tax</td><td style="text-align:right;">${money(invoice.tax)}</td></tr>
            <tr><td><strong>Total</strong></td><td style="text-align:right;"><strong>${money(
              invoice.total
            )}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
