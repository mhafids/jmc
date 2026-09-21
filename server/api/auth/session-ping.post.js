import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token') || getRequestHeader(event, 'authorization')?.replace('Bearer ', '');

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Tidak ada sesi aktif.',
    });
  }

  const payload = await verifyJwtToken(token, config.authSecret);
  if (!payload || !payload.sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Token sesi tidak valid atau kedaluwarsa.',
    });
  }

  const session = await db.query.userSessions?.findFirst?.({
    where: (tbl) => eq(tbl.id, payload.sessionId),
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi di database tidak ditemukan.',
    });
  }

  const idleTimeoutSec = config.public.sessionIdleTimeoutSeconds || 180;
  const rememberMeTtlSec = config.rememberMeTtlSeconds || 86400;
  const ttlToAdd = session.isRememberMe ? rememberMeTtlSec : idleTimeoutSec;
  const newExpiresAt = new Date(Date.now() + ttlToAdd * 1000);

  await db
    .update(schema.userSessions)
    .set({
      lastActivityAt: new Date(),
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.userSessions.id, session.id));

  return {
    success: true,
    message: 'Sesi berhasil diperpanjang.',
    lastActivityAt: new Date(),
    expiresAt: newExpiresAt,
  };
});
