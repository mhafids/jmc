import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';
import { recordActivityLog } from '~~/server/utils/audit.js';
import { uuidv7 } from 'uuidv7';

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
    if (perm && (perm.updateScope === 'all' || perm.updateScope === 'own')) {
      hasRoleAccess = true;
    }
  }

  if (!hasRoleAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Anda tidak memiliki wewenang untuk mengubah konfigurasi role (Read-Only).',
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

  const body = await readBody(event);
  const { name, description, permissions } = body || {};

  const updateData = {};
  if (typeof name === 'string' && name.trim()) {
    updateData.name = name.trim();
  }
  if (typeof description === 'string') {
    updateData.description = description.trim();
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(schema.roles).set(updateData).where(eq(schema.roles.id, roleId));
  }

  const normalizeScope = (val) => {
    if (!val) return 'no';
    const s = String(val).toLowerCase().trim();
    if (s === 'all') return 'all';
    if (s === 'own') return 'own';
    return 'no';
  };

  if (Array.isArray(permissions)) {
    for (const item of permissions) {
      if (!item.moduleId) continue;

      const canAccess = Boolean(item.canAccess);
      const canCreate = canAccess ? Boolean(item.canCreate) : false;
      const readScope = canAccess ? normalizeScope(item.readScope) : 'no';
      const updateScope = canAccess ? normalizeScope(item.updateScope) : 'no';
      const deleteScope = canAccess ? normalizeScope(item.deleteScope) : 'no';
      const notes = typeof item.notes === 'string' ? item.notes.trim() : null;

      const existing = await db.query.rolePermissions?.findFirst?.({
        where: (tbl, { and, eq: eqCol }) =>
          and(eqCol(tbl.roleId, roleId), eqCol(tbl.moduleId, item.moduleId)),
      });

      if (existing) {
        await db
          .update(schema.rolePermissions)
          .set({
            canAccess,
            canCreate,
            readScope,
            updateScope,
            deleteScope,
            notes,
            updatedAt: new Date(),
          })
          .where(eq(schema.rolePermissions.id, existing.id));
      } else {
        await db.insert(schema.rolePermissions).values({
          id: uuidv7(),
          roleId,
          moduleId: item.moduleId,
          canAccess,
          canCreate,
          readScope,
          updateScope,
          deleteScope,
          notes,
        });
      }
    }
  }

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'ROLES',
    action: 'update',
    description: `Pembaruan hak akses role '${targetRole.name}' (${targetRole.id}) oleh '${currentUser.username}'.`,
    subjectId: roleId,
    newValues: {
      name: name || targetRole.name,
      description: description !== undefined ? description : targetRole.description,
      permissionsCount: Array.isArray(permissions) ? permissions.length : 0,
    },
  });

  return {
    success: true,
    message: 'Perubahan role dan hak akses berhasil disimpan.',
  };
});
