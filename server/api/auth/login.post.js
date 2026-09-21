import argon2 from 'argon2';
import { eq, or } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyCaptchaToken } from '~~/server/utils/captcha.js';
import { maskEmail, generateNumericOtp, createJwtToken } from '~~/server/utils/auth.js';
import { sendOtpEmail } from '~~/server/utils/mail.js';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig(event);

  const identifier = body?.identifier?.trim();
  const password = body?.password;
  const captchaCode = body?.captchaCode?.trim();
  const captchaToken = body?.captchaToken;
  const isRememberMe = Boolean(body?.rememberMe);

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifier (Username/Email/Cellphone) dan Password wajib diisi.',
    });
  }

  if (!captchaCode || !captchaToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kode Captcha wajib diisi.',
    });
  }

  const isCaptchaValid = verifyCaptchaToken(captchaCode, captchaToken, config.captchaSecret);
  if (!isCaptchaValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kode Captcha salah atau telah kedaluwarsa. Silakan refresh dan coba lagi.',
    });
  }

  const user = await db.query.users?.findFirst?.({
    where: (tbl) =>
      or(
        eq(tbl.username, identifier),
        eq(tbl.email, identifier),
        eq(tbl.cellphone, identifier)
      ),
  });

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Username, Email, atau No. Handphone tidak terdaftar.',
    });
  }

  if (!user.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator sistem.',
    });
  }

  let isPasswordValid = false;
  try {
    isPasswordValid = await argon2.verify(user.password, password);
  } catch (err) {
    console.error('Argon2 verify error:', err);
  }

  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Password yang Anda masukkan salah.',
    });
  }

  const otpDigits = config.public.otpDigits || 4;
  const otpTtlSeconds = config.public.otpTtlSeconds || 180;
  const otpCode = generateNumericOtp(otpDigits);
  const expiresAt = new Date(Date.now() + otpTtlSeconds * 1000);

  const otpId = uuidv7();
  await db.insert(schema.otpVerifications).values({
    id: otpId,
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

  const otpSessionToken = await createJwtToken(
    {
      userId: user.id,
      otpId: otpId,
      email: user.email,
      isRememberMe: isRememberMe,
    },
    config.authSecret,
    `${otpTtlSeconds + 60}s`
  );

  return {
    success: true,
    mfaRequired: true,
    message: 'Kode OTP 4-digit telah dikirimkan ke email Anda.',
    maskedEmail: maskEmail(user.email),
    otpSessionToken: otpSessionToken,
    expiresIn: otpTtlSeconds,
    cooldownSeconds: config.public.otpResendCooldownSeconds || 60,
  };
});
