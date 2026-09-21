import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';

export async function requireEmployeeAccess(event, requiredAction = 'read') {
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

  const empModule = await db.query.modules?.findFirst?.({
    where: (tbl) => eq(tbl.code, 'EMPLOYEES'),
  });

  let permission = null;
  if (empModule && currentUser.roleId) {
    permission = await db.query.rolePermissions?.findFirst?.({
      where: (tbl, { and, eq: eqCol }) =>
        and(eqCol(tbl.roleId, currentUser.roleId), eqCol(tbl.moduleId, empModule.id)),
    });
  }

  if (!permission || !permission.canAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Role Anda tidak diizinkan mengakses modul Data Pegawai.',
    });
  }

  if (requiredAction === 'read') {
    if (permission.readScope === 'no') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Anda tidak memiliki izin untuk melihat data pegawai.',
      });
    }
  } else if (requiredAction === 'create') {
    if (!permission.canCreate) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Anda tidak memiliki izin untuk menambah data pegawai baru.',
      });
    }
  } else if (requiredAction === 'update') {
    if (permission.updateScope === 'no') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Anda tidak memiliki izin untuk mengubah data pegawai.',
      });
    }
  } else if (requiredAction === 'delete') {
    if (permission.deleteScope === 'no') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Anda tidak memiliki izin untuk menghapus data pegawai.',
      });
    }
  }

  return { currentUser, currentRole, permission };
}
