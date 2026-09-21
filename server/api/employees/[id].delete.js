import { eq, or, isNull, and } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireEmployeeAccess(event, 'delete');

  const identifier = getRouterParam(event, 'id');
  if (!identifier) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter ID pegawai diperlukan.',
    });
  }

  const employee = await db.query.employees?.findFirst?.({
    where: (tbl, { and, eq, isNull, or }) =>
      and(isNull(tbl.deletedAt), or(eq(tbl.id, identifier), eq(tbl.nip, identifier))),
  });

  if (!employee) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Data pegawai tidak ditemukan.',
    });
  }

  const linkedUsers = await db
    .select({
      userId: schema.users.id,
      roleId: schema.users.roleId,
      roleCode: schema.roles.code,
      roleName: schema.roles.name,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(and(eq(schema.users.employeeId, employee.id), isNull(schema.users.deletedAt)));

  const hasSuperadminUser = linkedUsers.some(
    (u) =>
      u.roleCode?.toLowerCase() === 'superadmin' ||
      u.roleName?.toLowerCase().startsWith('superadmin')
  );

  if (hasSuperadminUser) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Data pegawai terhubung dengan akun Superadmin dan tidak dapat dihapus.',
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.employees)
      .set({
        deletedAt: new Date(),
        updatedBy: currentUser.id,
      })
      .where(eq(schema.employees.id, employee.id));

    for (const u of linkedUsers) {
      await tx
        .update(schema.users)
        .set({
          status: 'inactive',
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, u.userId));

      await tx
        .update(schema.userSessions)
        .set({
          loggedOutAt: new Date(),
        })
        .where(and(eq(schema.userSessions.userId, u.userId), isNull(schema.userSessions.loggedOutAt)));
    }
  });

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'EMPLOYEES',
    action: 'delete',
    description: `Menghapus data pegawai '${employee.name}' (NIP: ${employee.nip}) secara soft-delete.`,
    subjectId: employee.id,
    oldValues: {
      nip: employee.nip,
      name: employee.name,
      email: employee.email,
    },
  });

  setResponseStatus(event, 204);
  return null;
});
