export const passwordResetRequestHTML = (name: string, resetUrl: string) => `
  <html>
    <body>
      <h1>Password Reset Request</h1>
      <p>Hello ${name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
    </body>
  </html>
`

export const passwordResetRequestText = (name: string, resetUrl: string) => `
Password Reset Request
Hello ${name},
You requested a password reset. Click the link below to reset your password:
${resetUrl}
`
