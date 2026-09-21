import { inArray, and, isNull, eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireEmployeeAccess(event, 'delete');

  const body = await readBody(event);
  const { ids } = body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Daftar ID pegawai (ids) tidak boleh kosong.',
    });
  }

  const linkedSuperadmins = await db
    .select({
      employeeId: schema.users.employeeId,
      employeeName: schema.users.name,
      roleCode: schema.roles.code,
      roleName: schema.roles.name,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(
      and(
        inArray(schema.users.employeeId, ids),
        isNull(schema.users.deletedAt)
      )
    );

  const hasSuperadmin = linkedSuperadmins.some(
    (u) =>
      u.roleCode?.toLowerCase() === 'superadmin' ||
      u.roleName?.toLowerCase().startsWith('superadmin')
  );

  if (hasSuperadmin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Terdapat data pegawai yang terhubung dengan akun Superadmin dan tidak dapat dihapus.',
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.employees)
      .set({
        deletedAt: new Date(),
        updatedBy: currentUser.id,
      })
      .where(and(inArray(schema.employees.id, ids), isNull(schema.employees.deletedAt)));

    const affectedUsers = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(inArray(schema.users.employeeId, ids), isNull(schema.users.deletedAt)));

    const userIds = affectedUsers.map((u) => u.id);
    if (userIds.length > 0) {
      await tx
        .update(schema.users)
        .set({
          status: 'inactive',
          isActive: false,
          updatedAt: new Date(),
        })
        .where(inArray(schema.users.id, userIds));

      await tx
        .update(schema.userSessions)
        .set({
          loggedOutAt: new Date(),
        })
        .where(and(inArray(schema.userSessions.userId, userIds), isNull(schema.userSessions.loggedOutAt)));
    }
  });

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'EMPLOYEES',
    action: 'delete',
    description: `Penghapusan massal (soft-delete) untuk ${ids.length} pegawai.`,
    newValues: { ids },
  });

  setResponseStatus(event, 204);
  return null;
});
