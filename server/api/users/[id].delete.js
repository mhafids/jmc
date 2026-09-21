import { eq, and, isNull } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireSuperadmin } from '~~/server/utils/user-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireSuperadmin(event);

  const userId = getRouterParam(event, 'id');
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter User ID diperlukan.',
    });
  }

  if (currentUser.id === userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.',
    });
  }

  const targetUser = await db.query.users?.findFirst?.({
    where: (tbl, { and, eq: eqCol, isNull: isNullCol }) =>
      and(eqCol(tbl.id, userId), isNullCol(tbl.deletedAt)),
  });

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data pengguna tidak ditemukan.',
    });
  }

  const now = new Date();

  await db
    .update(schema.users)
    .set({
      deletedAt: now,
      status: 'inactive',
      isActive: false,
      updatedAt: now,
    })
    .where(eq(schema.users.id, userId));

  await db
    .update(schema.userSessions)
    .set({
      loggedOutAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.userSessions.userId, userId),
        isNull(schema.userSessions.loggedOutAt)
      )
    );

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'USERS',
    action: 'delete',
    description: `Superadmin '${currentUser.username}' menghapus (soft-delete) user '${targetUser.username}' (${targetUser.id}).`,
    subjectId: targetUser.id,
    oldValues: {
      id: targetUser.id,
      name: targetUser.name,
      username: targetUser.username,
      email: targetUser.email,
      roleId: targetUser.roleId,
    },
    newValues: {
      deletedAt: now,
      status: 'inactive',
    },
  });

  setResponseStatus(event, 204);
  return null;
});
