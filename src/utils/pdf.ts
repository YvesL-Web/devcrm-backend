// import { env } from '../config/env.js'

// export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
//   const engine = (process.env.PDF_ENGINE || env.PDF_ENGINE || 'auto').toLowerCase()

//   // Try Playwright (Chromium/Edge/Chrome)
//   if (engine === 'playwright' || engine === 'auto') {
//     try {
//       const { chromium } = await import('playwright')
//       const browser = await chromium.launch({
//         headless: true,
//         channel: process.env.PLAYWRIGHT_EXECUTABLE_PATH
//           ? undefined
//           : process.env.PLAYWRIGHT_CHANNEL || 'chromium',
//         executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined
//       })
//       try {
//         const context = await browser.newContext()
//         const page = await context.newPage()
//         await page.setContent(html, { waitUntil: 'networkidle' })
//         const pdf = await page.pdf({
//           format: 'A4',
//           printBackground: true,
//           margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
//         })
//         await context.close()
//         return pdf as unknown as Buffer
//       } finally {
//         await browser.close()
//       }
//     } catch (e) {
//       if (engine === 'playwright') throw e
//       console.warn('Playwright not available, falling back to Puppeteer:', (e as Error).message)
//     }
//   }

//   // Puppeteer fallback
//   const puppeteer = await import('puppeteer')
//   const browser = await puppeteer.launch({
//     headless: 'shell',
//     executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   })
//   try {
//     const page = await browser.newPage()
//     await page.setContent(html, { waitUntil: 'networkidle0' })
//     const pdf = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
//     })
//     return pdf as Buffer
//   } finally {
//     await browser.close()
//   }
// }

import { chromium } from 'playwright'

export async function htmlToPdfBuffer(html: string, opts?: { format?: 'A4' | 'Letter' }) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=medium'] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({
      format: opts?.format ?? 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    })
    return pdf
  } finally {
    await browser.close()
  }
}
