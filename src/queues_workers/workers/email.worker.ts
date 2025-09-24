import { Job, UnrecoverableError } from 'bullmq'
import { env } from '../../config/env'
import { sendEmailWithAttachment } from '../../emails/resend'
import { commentMentionHTML, commentMentionText } from '../../emails/templates/commentMentionHTML'
import {
  emailVerificationHTML,
  emailVerificationText
} from '../../emails/templates/emailVerificationHTML'
import {
  passwordResetRequestHTML,
  passwordResetRequestText
} from '../../emails/templates/passwordResetRequestHTML'
import { makeWorker } from './worker'

export const emailWorker = makeWorker('email', async (job: Job<any>) => {
  try {
    switch (job.name) {
      case 'sendVerificationEmail': {
        const p = job.data
        const to: string = p.to
        const token: string = p.token
        const verifyUrl = `${env.FRONTEND_URL}/verify?token=${encodeURIComponent(token)}`

        const subject = 'Verify your email'
        const html = emailVerificationHTML(p.to, verifyUrl, env.EMAIL_VERIFY_TTL || '1h')
        const text = emailVerificationText(p.to, verifyUrl, env.EMAIL_VERIFY_TTL || '1h')

        await sendEmailWithAttachment({
          to,
          subject,
          html,
          text
        })

        return { sent: true }
      }

      case 'sendResetPwdEmail': {
        const p = job.data
        const to: string = p.to
        const url: string = p.url

        const subject = 'Reset your password'
        const html = passwordResetRequestHTML(to, url)
        const text = passwordResetRequestText(to, url)

        await sendEmailWithAttachment({
          to,
          subject,
          html,
          text
        })

        return { sent: true }
      }

      case 'sendInvoiceEmail': {
        const p = job.data as {
          to: string
          subject: string
          text?: string
          html?: string
          attachment: {
            filename: string
            contentBase64: string
            contentType?: string // e.g. 'application/pdf'
          }
        }

        if (!p?.to) {
          const err: any = new Error('Missing recipient email')
          err.nonRetryable = true
          throw err
        }
        if (!p?.attachment?.contentBase64 || !p?.attachment?.filename) {
          const err: any = new Error('Missing invoice attachment')
          err.nonRetryable = true
          throw err
        }

        await sendEmailWithAttachment({
          to: p.to,
          subject: p.subject,
          html: p.html,
          text: p.text,
          // on passe la PJ directement en base64 (pas besoin d’écrire un fichier temporaire)
          attachmentBase64: p.attachment.contentBase64,
          attachmentFilename: p.attachment.filename,
          attachmentContentType: p.attachment.contentType || 'application/pdf'
        })

        return { sent: true }
      }

      case 'sendCommentMention': {
        const p = job.data as {
          to: string
          authorName: string
          taskTitle: string
          projectName?: string
          commentBody: string
          linkUrl?: string
        }

        const subject = p.projectName
          ? `[${p.projectName}] You were mentioned on "${p.taskTitle}"`
          : `You were mentioned on "${p.taskTitle}"`

        const html = commentMentionHTML({
          to: p.to,
          authorName: p.authorName,
          taskTitle: p.taskTitle,
          projectName: p.projectName || '',
          commentBody: p.commentBody,
          linkUrl: p.linkUrl || ''
        })

        const text = commentMentionText({
          to: p.to,
          authorName: p.authorName,
          taskTitle: p.taskTitle,
          projectName: p.projectName || '',
          commentBody: p.commentBody,
          linkUrl: p.linkUrl || ''
        })
        await sendEmailWithAttachment({ to: p.to, subject, html, text })
        return { sent: true }
      }

      default:
        console.warn(`No handler for email job name: ${job.name}`)
        return { skipped: true }
    }
  } catch (error: any) {
    if (error?.nonRetryable) {
      console.error(`Non-retryable error for email job ${job.id}:`, error.message)
      throw new UnrecoverableError(error.message)
    }
    console.error('Retryable error for email job', job.id, error.message)
    throw error
  }
})
