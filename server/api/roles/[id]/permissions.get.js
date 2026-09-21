import { eq, isNull, asc } from 'drizzle-orm';
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

  const currentUser = await db.query.users?.findFirst?.({
    where: (tbl) => eq(tbl.id, payload.userId),
  });

  if (!currentUser || !currentUser.isActive) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Akun tidak aktif atau tidak ditemukan.',
    });
  }

  const currentRole = await db.query.roles?.findFirst?.({
    where: (tbl) => eq(tbl.id, currentUser.roleId),
  });

  const roleModule = await db.query.modules?.findFirst?.({
    where: (tbl) => eq(tbl.code, 'ROLES'),
  });

  let hasRoleAccess = false;
  if (currentRole && currentRole.name.toLowerCase().startsWith('superadmin')) {
    hasRoleAccess = true;
  } else if (roleModule && currentUser.roleId) {
    const perm = await db.query.rolePermissions?.findFirst?.({
      where: (tbl, { and, eq: eqCol }) =>
        and(eqCol(tbl.roleId, currentUser.roleId), eqCol(tbl.moduleId, roleModule.id)),
    });
    if (perm?.canAccess) {
      hasRoleAccess = true;
    }
  }

  if (!hasRoleAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Anda tidak memiliki wewenang untuk melihat hak akses role.',
    });
  }

  const roleId = getRouterParam(event, 'id');
  if (!roleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter ID role diperlukan.',
    });
  }

  const targetRole = await db.query.roles?.findFirst?.({
    where: (tbl) => eq(tbl.id, roleId),
  });

  if (!targetRole) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data role tidak ditemukan.',
    });
  }

  const allModules = await db
    .select({
      id: schema.modules.id,
      code: schema.modules.code,
      name: schema.modules.name,
      path: schema.modules.path,
      orderNo: schema.modules.orderNo,
    })
    .from(schema.modules)
    .where(isNull(schema.modules.deletedAt))
    .orderBy(asc(schema.modules.orderNo));

  const permissionsList = await db
    .select({
      id: schema.rolePermissions.id,
      moduleId: schema.rolePermissions.moduleId,
      canAccess: schema.rolePermissions.canAccess,
      canCreate: schema.rolePermissions.canCreate,
      readScope: schema.rolePermissions.readScope,
      updateScope: schema.rolePermissions.updateScope,
      deleteScope: schema.rolePermissions.deleteScope,
      notes: schema.rolePermissions.notes,
    })
    .from(schema.rolePermissions)
    .where(
      eq(schema.rolePermissions.roleId, roleId)
    );

  const permissionMap = new Map();
  for (const p of permissionsList) {
    permissionMap.set(p.moduleId, p);
  }

  const matrix = allModules.map((m) => {
    const perm = permissionMap.get(m.id);

    return {
      moduleId: m.id,
      moduleCode: m.code,
      moduleName: m.name,
      path: m.path,
      orderNo: m.orderNo,
      canAccess: Boolean(perm?.canAccess),
      canCreate: Boolean(perm?.canCreate),
      readScope: perm?.readScope || 'no',
      updateScope: perm?.updateScope || 'no',
      deleteScope: perm?.deleteScope || 'no',
      notes: perm?.notes || null,
    };
  });

  return {
    success: true,
    role: {
      id: targetRole.id,
      name: targetRole.name,
      description: targetRole.description || '',
    },
    permissions: matrix,
  };
});
