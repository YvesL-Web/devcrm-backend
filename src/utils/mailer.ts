import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let cached: Transporter | null = null;

export function getTransport(): Transporter {
  if (cached) return cached;
  const secure = (env.SMTP_SECURE ?? '').toString().toLowerCase() === 'true';
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'localhost',
    port: env.SMTP_PORT || 1025,
    secure,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  cached = transporter;
  return transporter;
}
