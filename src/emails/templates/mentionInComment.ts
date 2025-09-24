import { escapeHtml } from '../../utils/escapeHtml'

export const mentionInCommentHTML = (
  taskTitle: string,
  projectName: string | null,
  openTaskUrl: string | null,
  commentPreview: string
) => `
  <p>You were mentioned in a comment on <strong>${escapeHtml(taskTitle)}</strong>
    ${projectName ? ' (' + escapeHtml(projectName) + ')' : ''}.
  </p>
  <blockquote style="border-left:4px solid #ccc;padding-left:8px;color:#444">
    ${escapeHtml(commentPreview)}
  </blockquote>
  ${openTaskUrl ? `<p><a href="${openTaskUrl}">Open task</a></p>` : ''}`

export const mentionInCommentText = (
  taskTitle: string,
  projectName: string | null,
  openTaskUrl: string | null,
  commentPreview: string
) => `
You were mentioned on "${taskTitle}"${projectName ? ' (' + projectName + ')' : ''}.
---
${commentPreview}
${openTaskUrl ? `Open task: ${openTaskUrl}` : ''}`
