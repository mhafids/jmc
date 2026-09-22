import nodemailer from 'nodemailer';
import { MailtrapTransport } from 'mailtrap';

export async function sendOtpEmail({ to, otpCode, name, ttlSeconds = 180 }, runtimeConfig) {
  const driver = runtimeConfig.mailDriver || 'log';
  const minutes = Math.floor(ttlSeconds / 60);

  // 1. Log mode (Development / Mock)
  if (driver === 'log') {
    console.log('\n=============================================================');
    console.log('📬 [EMAIL MOCK / LOG DRIVER] - MULTI-FACTOR AUTHENTICATION');
    console.log(`To:         ${name} <${to}>`);
    console.log(`Subject:    Kode OTP Verifikasi Login Anda: ${otpCode}`);
    console.log(`Kode OTP:   >>> ${otpCode} <<<`);
    console.log(`Berlaku:    ${ttlSeconds} detik (~${minutes} menit)`);
    console.log('Peringatan: Jangan berikan kode ini kepada siapa pun.');
    console.log('=============================================================\n');
    return { success: true, driver: 'log' };
  }

  // 2. Mailtrap Official SDK Transport Mode (Token / API)
  if (driver === 'mailtrap') {
    const token = runtimeConfig.mailtrapToken;
    if (!token) {
      console.error('[MAILTRAP ERROR] MAILTRAP_TOKEN is not configured in environment variables.');
      throw new Error('Konfigurasi MAILTRAP_TOKEN belum diatur.');
    }

    const inboxId = runtimeConfig.mailtrapInboxId ? Number(runtimeConfig.mailtrapInboxId) : 4922148;

    const transport = nodemailer.createTransport(
      MailtrapTransport({
        token: token,
        sandbox: true,
        testInboxId: inboxId,
      })
    );

    const sender = {
      address: runtimeConfig.smtpFrom || 'hello@demomailtrap.co',
      name: runtimeConfig.smtpFromName || 'Prototipe JMC Admin Security',
    };

    const info = await transport.sendMail({
      from: sender,
      to: [to],
      subject: `Kode OTP Verifikasi Login Anda: ${otpCode}`,
      text: `Halo ${name},\n\nKode OTP verifikasi login Anda adalah: ${otpCode}\nKode ini berlaku selama ${ttlSeconds} detik (~${minutes} menit).\n\nJangan berikan kode ini kepada siapa pun.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 480px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #206bc4; text-align: center; margin-top: 0;">Verifikasi Login</h2>
          <p>Halo <b>${name}</b>,</p>
          <p>Gunakan kode OTP berikut untuk menyelesaikan proses masuk ke akun Anda:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #206bc4; background: #f1f5f9; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Kode ini berlaku selama <b>${minutes} menit (${ttlSeconds} detik)</b>. Jangan membagikan kode ini kepada siapa pun.
          </p>
        </div>
      `,
      category: 'OTP Verification',
      sandbox: true,
    });

    console.log(`[MAILTRAP] OTP email sent successfully to ${to}. Info:`, info);
    return { success: true, driver: 'mailtrap', info };
  }

  // 3. Generic SMTP Transport (Fallback / alternative)
  if (driver === 'smtp') {
    const transport = nodemailer.createTransport({
      host: runtimeConfig.smtpHost,
      port: Number(runtimeConfig.smtpPort || 2525),
      auth: {
        user: runtimeConfig.smtpUser,
        pass: runtimeConfig.smtpPass,
      },
    });

    const info = await transport.sendMail({
      from: `"${runtimeConfig.smtpFromName}" <${runtimeConfig.smtpFrom}>`,
      to: `${name} <${to}>`,
      subject: `Kode OTP Verifikasi Login Anda: ${otpCode}`,
      text: `Halo ${name},\n\nKode OTP verifikasi login Anda adalah: ${otpCode}\nKode ini berlaku selama ${ttlSeconds} detik (~${minutes} menit).\n\nJangan berikan kode ini kepada siapa pun.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 480px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #206bc4; text-align: center; margin-top: 0;">Verifikasi Login</h2>
          <p>Halo <b>${name}</b>,</p>
          <p>Gunakan kode OTP berikut untuk menyelesaikan proses masuk ke akun Anda:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #206bc4; background: #f1f5f9; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Kode ini berlaku selama <b>${minutes} menit (${ttlSeconds} detik)</b>. Jangan membagikan kode ini kepada siapa pun.
          </p>
        </div>
      `,
    });

    console.log(`[SMTP Mailtrap] OTP email sent successfully to ${to}. MessageId:`, info.messageId);
    return { success: true, driver: 'smtp', info };
  }

  return { success: true };
}
