import { readFileSync } from 'fs'
import { Resend } from 'resend'
import { env } from '../config/env'

const resend = new Resend(env.RESEND_API_KEY)

type SendOpts = {
  to: string
  subject: string
  html?: string
  text?: string

  /** Option 1: lire une PJ depuis le disque */
  attachmentPath?: string
  attachmentFilename?: string

  /** Option 2: passer la PJ en base64 directement */
  attachmentBase64?: string
  attachmentContentType?: string
}

export async function sendEmailWithAttachment(opts: SendOpts) {
  const from = env.EMAIL_FROM || 'DevCRM <no-reply@devcrm.local>'

  // lecture pièce jointe sécurisée
  let attachments: { content: Buffer; filename?: string; contentType?: string }[] | undefined

  if (opts.attachmentBase64) {
    try {
      const buf = Buffer.from(opts.attachmentBase64, 'base64')
      attachments = [
        {
          content: buf,
          filename: opts.attachmentFilename,
          contentType: opts.attachmentContentType
        }
      ]
    } catch (e: any) {
      console.error(`Email attachment base64 decode error: ${e?.message || e}`)
      const err: any = new Error(`Attachment base64 decode failed: ${e?.message || e}`)
      err.nonRetryable = true
      throw err
    }
  } else if (opts.attachmentPath) {
    try {
      const content = readFileSync(opts.attachmentPath)
      attachments = [{ content, filename: opts.attachmentFilename }]
    } catch (e: any) {
      console.error(`Email attachment read error: ${e?.message || e}`)
      const err: any = new Error(`Attachment read failed: ${e?.message || e}`)
      err.nonRetryable = true
      throw err
    }
  }

  const { data, error } = await resend.emails.send({
    from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html ?? '',
    text: opts.text ?? '',
    attachments
  })

  if (error) {
    const status = (error as any)?.statusCode ?? (error as any)?.status ?? null
    const message = (error as any)?.message ?? JSON.stringify(error)

    const err: any = new Error(`Failed to send email: ${message}`)
    if (status === 429 || (typeof status === 'number' && status >= 500)) {
      // réseau / quota / serveur -> RETRIABLE
      err.nonRetryable = false
      console.warn(`Transient email error (${status}) -> will retry: ${message}`)
    } else {
      // 400, 401, 403, 404, etc. -> NON-RETRIABLE
      err.nonRetryable = true
      console.error(`Permanent email error (${status ?? 'n/a'}) -> do not retry: ${message}`)
    }
    throw err
  }

  console.info(`Email sent: ${data?.id}`)
  return data?.id
}
