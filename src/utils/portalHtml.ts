import { ChangelogItem } from '../entities/ChangelogItem.js'
import { Organization } from '../entities/Organization.js'
import { Project } from '../entities/Project.js'
import { Release } from '../entities/Release.js'

export function renderPortalHtml(params: {
  org: Organization
  project: Project
  releases: Array<{ release: Release; items: ChangelogItem[] }>
  invoices: Array<{
    id: string
    number: string
    total: number
    currency: string
    status: string
    issuedAt?: string
    pdfUrl?: string
  }>
}) {
  const { org, project, releases, invoices } = params

  const releasesHtml = releases.length
    ? releases
        .map(
          ({ release, items }) => `
      <div class="card">
        <h3>${escape(release.version ?? '')}${release.version ? ' — ' : ''}${escape(
            release.title
          )}</h3>
        <div class="muted">${new Date(release.createdAt).toLocaleDateString(
          org.locale || 'en'
        )}</div>

        ${release.bodyMd ? `<div class="md">${nl2br(escape(release.bodyMd))}</div>` : ''}

        ${
          items.length
            ? `
          <ul class="cl">
            ${items
              .map((i) => {
                const cls = i.type.toLowerCase() // feature | fix | chore
                const label = i.type[0] + i.type.slice(1).toLowerCase()
                const text = escape(i.title)
                const link = i.url
                  ? `<a href="${escape(i.url)}" target="_blank" rel="noopener">${text}</a>`
                  : text
                return `<li><span class="tag ${cls}">${label}</span> ${link}</li>`
              })
              .join('')}
          </ul>
        `
            : ''
        }
      </div>
    `
        )
        .join('')
    : '<div class="muted">No releases yet.</div>'

  const invoicesHtml = invoices.length
    ? `<table class="table">
        <thead><tr><th>Invoice</th><th>Date</th><th>Status</th><th class="num">Total</th><th></th></tr></thead>
        <tbody>
          ${invoices
            .map(
              (inv) => `
            <tr>
              <td>${escape(inv.number)}</td>
              <td>${inv.issuedAt || '—'}</td>
              <td>${escape(inv.status)}</td>
              <td class="num">${formatMoney(inv.total, inv.currency, org.locale)}</td>
              <td>${
                inv.pdfUrl ? `<a href="${inv.pdfUrl}" target="_blank" rel="noopener">PDF</a>` : ''
              }</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>`
    : '<div class="muted">No invoices to show.</div>'

  const welcome = project.portalWelcome || 'Welcome!'

  return `<!DOCTYPE html>
<html lang="${org.locale || 'en'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escape(project.name)} • Portal</title>
  <style>
    :root{ --brand:#0f172a; }
    *{ box-sizing:border-box }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Arial; margin:0; color:#0b0f14; background:#fff }
    .wrap{ max-width:1000px; margin:0 auto; padding:24px }
    header{ display:flex; align-items:center; gap:16px; margin-bottom:16px }
    header img{ height:36px }
    h1{ font-size:20px; margin:0 }
    .muted{ color:#64748b }
    .grid{ display:grid; grid-template-columns:1fr; gap:16px }
    .card{ border:1px solid #e2e8f0; border-radius:12px; padding:16px }
    .section-title{ display:flex; align-items:center; justify-content:space-between }
    .table{ width:100%; border-collapse:collapse }
    .table th, .table td{ border-bottom:1px solid #e2e8f0; padding:8px }
    .num{ text-align:right; white-space:nowrap }
    .cl{ margin:8px 0 0 0; padding-left:18px }
    .tag{ font-size:12px; border:1px solid #e2e8f0; border-radius:999px; padding:2px 8px; margin-right:6px }
    .tag.feature{ background:#ecfdf5; border-color:#d1fae5 }
    .tag.fix{ background:#fefce8; border-color:#fef3c7 }
    .tag.chore{ background:#eff6ff; border-color:#dbeafe }
    .md{ white-space: pre-wrap; margin-top:8px }
    footer{ margin-top:24px; color:#64748b; font-size:12px }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      ${org.logoUrl ? `<img src="${escape(org.logoUrl)}" alt="logo">` : ''}
      <div>
        <h1>${escape(project.name)}</h1>
        <div class="muted">${escape(org.name)}</div>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="section-title"><h2>Welcome</h2></div>
        <p>${escape(welcome)}</p>
      </div>

      <div class="card">
        <div class="section-title"><h2>Changelog</h2></div>
        ${releasesHtml}
      </div>

      <div class="card">
        <div class="section-title"><h2>Invoices</h2></div>
        ${invoicesHtml}
      </div>
    </div>

    <footer>
      ${escape(org.invoiceFooter || '')}
    </footer>
  </div>
</body>
</html>`
}

function escape(s: any) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  )
}
function nl2br(s: string) {
  return s.replace(/\\n/g, '<br/>')
}
function formatMoney(cents: number, currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale || 'en', { style: 'currency', currency }).format(
      cents / 100
    )
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}
