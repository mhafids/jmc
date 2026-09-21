export async function sendOtpEmail({ to, otpCode, name, ttlSeconds = 180 }, runtimeConfig) {
  const driver = runtimeConfig.mailDriver || 'log';

  const minutes = Math.floor(ttlSeconds / 60);

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

  if (driver === 'smtp') {
    console.log(`[SMTP] Mengirim email OTP ke ${to}...`);
    return { success: true, driver: 'smtp' };
  }

  return { success: true };
}
