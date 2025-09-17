export const emailVerificationHTML = (
  name: string,
  verifyUrl: string,
  expiredTTL: string | number
) => `
  <html>
    <body>
      <h1>Hello ${name},</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link expires in ${expiredTTL}.</p>
    </body>
  </html>
`

export const emailVerificationText = (
  name: string,
  verifyUrl: string,
  expiredTTL: string | number
) => `
Hello ${name},
Please verify your email by clicking the link below:
${verifyUrl}
This link expires in ${expiredTTL}.
`
