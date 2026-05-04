import nodemailer from 'nodemailer'

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT ?? 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM

const mailTransporter =
  smtpHost && smtpUser && smtpPass && smtpFrom
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null

export const isMailConfigured = Boolean(mailTransporter)

export const sendOtpEmail = async ({ to, code, name }) => {
  if (!mailTransporter) {
    throw new Error(
      'Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
    )
  }

  await mailTransporter.sendMail({
    from: smtpFrom,
    to,
    subject: 'Your login OTP code',
    text: `Hello ${name},\n\nYour OTP code is ${code}. It expires in 5 minutes.\n\nIf you did not request this login, ignore this email.`,
    html: `<p>Hello ${name},</p><p>Your OTP code is <strong>${code}</strong>.</p><p>This code expires in 5 minutes.</p><p>If you did not request this login, ignore this email.</p>`,
  })
}
