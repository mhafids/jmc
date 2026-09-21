import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken, createJwtToken } from '~~/server/utils/auth.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig(event);

  const otpCode = body?.otpCode?.toString().trim();
  const otpSessionToken = body?.otpSessionToken;

  if (!otpCode || !otpSessionToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kode OTP dan Session Token wajib disertakan.',
    });
  }

  const tokenPayload = await verifyJwtToken(otpSessionToken, config.authSecret);
  if (!tokenPayload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi OTP tidak valid atau telah kedaluwarsa. Silakan lakukan login ulang.',
    });
  }

  const { userId, otpId, isRememberMe } = tokenPayload;

  const otpRecord = await db.query.otpVerifications?.findFirst?.({
    where: (tbl) => eq(tbl.id, otpId),
  });

  if (!otpRecord) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data verifikasi OTP tidak ditemukan. Silakan login kembali.',
    });
  }

  if (otpRecord.isUsed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kode OTP ini sudah pernah digunakan. Silakan login kembali.',
    });
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Kode OTP telah kedaluwarsa. Silakan klik tombol Kirim Ulang OTP.',
    });
  }

  const maxAttempts = config.public.otpMaxAttempts || 3;
  if (otpRecord.attempts >= maxAttempts) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Batas 3x percobaan telah tercapai. Kode OTP dibatalkan. Silakan login dari awal.',
    });
  }

  if (otpRecord.otpCode !== otpCode) {
    const nextAttempts = otpRecord.attempts + 1;
    await db
      .update(schema.otpVerifications)
      .set({ attempts: nextAttempts, updatedAt: new Date() })
      .where(eq(schema.otpVerifications.id, otpId));

    const remainingAttempts = Math.max(0, maxAttempts - nextAttempts);

    if (remainingAttempts === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Batas 3x percobaan telah habis. Demi keamanan, silakan ulangi proses login.',
      });
    }

    throw createError({
      statusCode: 401,
      statusMessage: `Kode OTP salah! Sisa percobaan: ${remainingAttempts} kali.`,
    });
  }

  await db
    .update(schema.otpVerifications)
    .set({ isUsed: true, updatedAt: new Date() })
    .where(eq(schema.otpVerifications.id, otpId));

  const user = await db.query.users?.findFirst?.({
    where: (tbl) => eq(tbl.id, userId),
  });

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun tidak aktif atau tidak ditemukan.',
    });
  }

  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.users.id, userId));

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const reqHeaders = getRequestHeaders(event);
  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  const userAgent = reqHeaders['user-agent'] || '';

  const idleTimeoutSec = config.public.sessionIdleTimeoutSeconds || 180;
  const rememberMeTtlSec = config.rememberMeTtlSeconds || 86400;
  const sessionTtl = isRememberMe ? rememberMeTtlSec : idleTimeoutSec;
  const sessionExpiresAt = new Date(Date.now() + sessionTtl * 1000);

  const sessionId = uuidv7();
  await db.insert(schema.userSessions).values({
    id: sessionId,
    userId: user.id,
    sessionToken: sessionToken,
    ipAddress: ipAddress,
    userAgent: userAgent,
    isRememberMe: Boolean(isRememberMe),
    lastActivityAt: new Date(),
    expiresAt: sessionExpiresAt,
  });

  const role = await db.query.roles?.findFirst?.({
    where: (tbl) => eq(tbl.id, user.roleId),
  });

  const userPermissions = await db
    .select({
      moduleCode: schema.modules.code,
      moduleName: schema.modules.name,
      modulePath: schema.modules.path,
      canAccess: schema.rolePermissions.canAccess,
      canCreate: schema.rolePermissions.canCreate,
      readScope: schema.rolePermissions.readScope,
      updateScope: schema.rolePermissions.updateScope,
      deleteScope: schema.rolePermissions.deleteScope,
    })
    .from(schema.rolePermissions)
    .innerJoin(schema.modules, eq(schema.rolePermissions.moduleId, schema.modules.id))
    .where(eq(schema.rolePermissions.roleId, user.roleId));

  const allowedPaths = [];
  const permissionsMap = {};

  for (const perm of userPermissions) {
    const canAccess = Boolean(perm.canAccess);
    permissionsMap[perm.moduleCode] = {
      canAccess,
      canCreate: Boolean(perm.canCreate),
      readScope: perm.readScope || 'no',
      updateScope: perm.updateScope || 'no',
      deleteScope: perm.deleteScope || 'no',
    };
    if (canAccess && perm.modulePath) {
      allowedPaths.push(perm.modulePath);
    }
  }

  const authJwt = await createJwtToken(
    {
      sessionId: sessionId,
      userId: user.id,
      roleId: user.roleId,
      sessionToken: sessionToken,
      isRememberMe: Boolean(isRememberMe),
    },
    config.authSecret,
    `${sessionTtl}s`
  );

  setCookie(event, 'auth_token', authJwt, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: sessionTtl,
    path: '/',
  });

  await recordActivityLog(event, {
    userId: user.id,
    moduleCode: 'AUTH',
    action: 'login',
    description: `User '${user.username}' berhasil login melalui verifikasi OTP.`,
    subjectId: sessionId,
  });

  return {
    success: true,
    message: 'Autentikasi berhasil.',
    token: authJwt,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      cellphone: user.cellphone,
      jobTitle: user.jobTitle,
      department: user.department,
      roleId: user.roleId,
      roleName: role ? role.name : '',
      permissions: permissionsMap,
      allowedPaths,
    },
    isRememberMe: Boolean(isRememberMe),
  };
});
