import { eq, isNull, and, sql } from 'drizzle-orm';
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

  const roleModule = await db.query.modules?.findFirst?.({
    where: (tbl) => eq(tbl.code, 'ROLES'),
  });

  let hasRoleAccess = false;
  if (role && role.name.toLowerCase().startsWith('superadmin')) {
    hasRoleAccess = true;
  } else if (roleModule && user.roleId) {
    const perm = await db.query.rolePermissions?.findFirst?.({
      where: (tbl, { and, eq: eqCol }) =>
        and(eqCol(tbl.roleId, user.roleId), eqCol(tbl.moduleId, roleModule.id)),
    });
    if (perm?.canAccess) {
      hasRoleAccess = true;
    }
  }

  if (!hasRoleAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Anda tidak memiliki akses ke modul ini.',
    });
  }

  const roleList = await db
    .select({
      id: schema.roles.id,
      name: schema.roles.name,
      description: schema.roles.description,
      userCount: sql`cast(count(${schema.users.id}) as unsigned)`,
      createdAt: schema.roles.createdAt,
      updatedAt: schema.roles.updatedAt,
    })
    .from(schema.roles)
    .leftJoin(
      schema.users,
      and(
        eq(schema.roles.id, schema.users.roleId),
        isNull(schema.users.deletedAt)
      )
    )
    .where(isNull(schema.roles.deletedAt))
    .groupBy(schema.roles.id);

  return {
    success: true,
    data: roleList,
  };
});
