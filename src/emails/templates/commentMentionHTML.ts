import { escapeHtml } from '../../utils/escapeHtml'

export function commentMentionHTML(args: {
  to: string
  authorName: string
  taskTitle: string
  projectName?: string
  commentBody: string
  linkUrl: string
}) {
  const { to, authorName, taskTitle, projectName, commentBody, linkUrl } = args
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">
    <p>Hi ${to},</p>
    <p><strong>${authorName}</strong> mentioned you in a comment on task <strong>${taskTitle}</strong>${
    projectName ? ` in <em>${projectName}</em>` : ''
  }.</p>
    <blockquote style="border-left:3px solid #e2e8f0;margin:12px 0;padding:8px 12px;color:#334155;white-space:pre-wrap;">${escapeHtml(
      commentBody
    )}</blockquote>
    <p><a href="${linkUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;">Open task</a></p>
    <p style="color:#64748b">— DevCRM</p>
  </div>
  `
}

export function commentMentionText(args: {
  to: string
  authorName: string
  taskTitle: string
  projectName?: string
  commentBody: string
  linkUrl: string
}) {
  const { to, authorName, taskTitle, projectName, commentBody, linkUrl } = args
  return `Hi ${to},

${authorName} mentioned you in a comment on task "${taskTitle}" ${
    projectName ? `in ${projectName} ` : ''
  }.

"${commentBody}"

Open task: ${linkUrl}

— DevCRM`
}
