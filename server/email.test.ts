import { describe, it, expect } from 'vitest';
import nodemailer from 'nodemailer';

describe('SMTP Email Configuration', () => {
  it('should verify SMTP connection to Zoho', async () => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'info@naashah.com',
        pass: process.env.SMTP_PASS || '',
      },
    });

    // Verify connection
    const result = await transporter.verify();
    expect(result).toBe(true);
  }, 15000);
});
