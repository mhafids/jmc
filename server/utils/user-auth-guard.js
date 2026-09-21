import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';

export async function requireSuperadmin(event) {
  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token') || getRequestHeader(event, 'authorization')?.replace('Bearer ', '');

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthenticated: Token sesi tidak ditemukan.',
    });
  }

  const payload = await verifyJwtToken(token, config.authSecret);
  if (!payload || !payload.userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Sesi tidak valid atau telah kedaluwarsa.',
    });
  }

  if (payload.sessionId) {
    const activeSession = await db.query.userSessions?.findFirst?.({
      where: (tbl) => eq(tbl.id, payload.sessionId),
    });

    if (!activeSession || activeSession.loggedOutAt) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Sesi telah berakhir atau dibatalkan.',
      });
    }

    if (!activeSession.isRememberMe && new Date() > new Date(activeSession.expiresAt)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Sesi telah kedaluwarsa karena inaktivitas.',
      });
    }
  }

  const currentUser = await db.query.users?.findFirst?.({
    where: (tbl) => eq(tbl.id, payload.userId),
  });

  if (!currentUser || !currentUser.isActive || currentUser.deletedAt) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Akun tidak aktif atau telah dihapus.',
    });
  }

  const currentRole = await db.query.roles?.findFirst?.({
    where: (tbl) => eq(tbl.id, currentUser.roleId),
  });

  const isSuperadmin =
    currentRole?.code?.toLowerCase() === 'superadmin' ||
    currentRole?.name?.toLowerCase().startsWith('superadmin');

  if (!isSuperadmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Anda tidak memiliki wewenang Superadmin untuk mengelola pengguna.',
    });
  }

  return { currentUser, currentRole };
}
