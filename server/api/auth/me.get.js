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
      statusMessage: 'Unauthenticated',
    });
  }

  const payload = await verifyJwtToken(token, config.authSecret);
  if (!payload || !payload.userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Token invalid or expired',
    });
  }

  if (payload.sessionId) {
    const activeSession = await db.query.userSessions?.findFirst?.({
      where: (tbl) => eq(tbl.id, payload.sessionId),
    });

    if (!activeSession || activeSession.loggedOutAt) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Sesi telah berakhir atau telah logout.',
      });
    }

    if (!activeSession.isRememberMe) {
      if (new Date() > new Date(activeSession.expiresAt)) {
        await db.delete(schema.userSessions).where(eq(schema.userSessions.id, activeSession.id));
        deleteCookie(event, 'auth_token');
        throw createError({
          statusCode: 401,
          statusMessage: 'Sesi telah kedaluwarsa karena inaktivitas.',
        });
      }
    }
  }

  const user = await db.query.users?.findFirst?.({
    where: (tbl) => eq(tbl.id, payload.userId),
  });

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Akun tidak aktif atau tidak ditemukan.',
    });
  }

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

  return {
    success: true,
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
    isRememberMe: Boolean(payload.isRememberMe),
  };
});
