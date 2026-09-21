import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken, generateNumericOtp, createJwtToken } from '~~/server/utils/auth.js';
import { sendOtpEmail } from '~~/server/utils/mail.js';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig(event);

  const otpSessionToken = body?.otpSessionToken;
  if (!otpSessionToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Session token OTP tidak ditemukan.',
    });
  }

  const payload = await verifyJwtToken(otpSessionToken, config.authSecret);
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi OTP tidak valid atau kedaluwarsa. Silakan lakukan login kembali.',
    });
  }

  const { userId, email, isRememberMe } = payload;

  const user = await db.query.users?.findFirst?.({
    where: (tbl, { eq }) => eq(tbl.id, userId),
  });

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun tidak valid atau dinonaktifkan.',
    });
  }

  const otpDigits = config.public.otpDigits || 4;
  const otpTtlSeconds = config.public.otpTtlSeconds || 180;
  const otpCode = generateNumericOtp(otpDigits);
  const expiresAt = new Date(Date.now() + otpTtlSeconds * 1000);

  const newOtpId = uuidv7();
  await db.insert(schema.otpVerifications).values({
    id: newOtpId,
    userId: user.id,
    email: user.email,
    otpCode: otpCode,
    purpose: 'LOGIN',
    expiresAt: expiresAt,
    isUsed: false,
    attempts: 0,
  });

  await sendOtpEmail(
    {
      to: user.email,
      otpCode: otpCode,
      name: user.name,
      ttlSeconds: otpTtlSeconds,
    },
    config
  );

  const newOtpSessionToken = await createJwtToken(
    {
      userId: user.id,
      otpId: newOtpId,
      email: user.email,
      isRememberMe: isRememberMe,
    },
    config.authSecret,
    `${otpTtlSeconds + 60}s`
  );

  return {
    success: true,
    message: 'Kode OTP baru telah berhasil dikirimkan ke email Anda.',
    otpSessionToken: newOtpSessionToken,
    expiresIn: otpTtlSeconds,
    cooldownSeconds: config.public.otpResendCooldownSeconds || 60,
  };
});
