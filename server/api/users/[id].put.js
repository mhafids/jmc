import crypto from 'node:crypto';
import argon2 from 'argon2';
import { eq, and, isNull, ne } from 'drizzle-orm';
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

  const body = await readBody(event);
  const {
    username,
    password,
    roleId,
    jobTitle,
    department,
    status,
  } = body || {};

  if (currentUser.id === targetUser.id && status === 'inactive') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Anda tidak dapat menonaktifkan status akun Anda sendiri.',
    });
  }

  const updateData = {};
  const oldValues = {
    username: targetUser.username,
    roleId: targetUser.roleId,
    status: targetUser.status,
    jobTitle: targetUser.jobTitle,
    department: targetUser.department,
  };

  if (username && username.trim() !== targetUser.username) {
    const cleanUsername = username.trim();
    const usernameRegex = /^[a-z0-9]{6,}$/;
    if (!usernameRegex.test(cleanUsername)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Format username tidak valid. Minimal 6 karakter, alfanumerik huruf kecil, tanpa spasi.',
      });
    }

    const duplicateUsername = await db.query.users?.findFirst?.({
      where: (tbl, { and, eq: eqCol, ne: neCol, isNull: isNullCol }) =>
        and(eqCol(tbl.username, cleanUsername), neCol(tbl.id, targetUser.id), isNullCol(tbl.deletedAt)),
    });

    if (duplicateUsername) {
      throw createError({
        statusCode: 409,
        statusMessage: `Username '${cleanUsername}' sudah digunakan oleh pengguna lain.`,
      });
    }

    updateData.username = cleanUsername;
  }

  if (password && String(password).trim().length > 0) {
    const cleanPassword = String(password);
    if (cleanPassword.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password minimal 8 karakter.',
      });
    }
    if (/\s/.test(cleanPassword)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password tidak boleh mengandung spasi.',
      });
    }
    if (!/[A-Z]/.test(cleanPassword)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password harus mengandung minimal 1 huruf besar.',
      });
    }
    if (!/[a-z]/.test(cleanPassword)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password harus mengandung minimal 1 huruf kecil.',
      });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(cleanPassword)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password harus mengandung minimal 1 karakter khusus / simbol.',
      });
    }

    const salt = crypto.randomBytes(16);
    updateData.password = await argon2.hash(cleanPassword, {
      type: argon2.argon2id,
      salt,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    updateData.passwordChangedAt = new Date();
  }

  if (roleId && roleId !== targetUser.roleId) {
    updateData.roleId = roleId;
  }

  if (jobTitle !== undefined) {
    updateData.jobTitle = jobTitle || null;
  }

  if (department !== undefined) {
    updateData.department = department || null;
  }

  let statusChangedToInactive = false;
  if (status && (status === 'active' || status === 'inactive')) {
    const isNowActive = status === 'active';
    if (targetUser.status === 'active' && status === 'inactive') {
      statusChangedToInactive = true;
    }
    updateData.status = status;
    updateData.isActive = isNowActive;
  }

  updateData.updatedAt = new Date();

  await db.update(schema.users).set(updateData).where(eq(schema.users.id, targetUser.id));

  if (statusChangedToInactive) {
    await db
      .update(schema.userSessions)
      .set({
        loggedOutAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userSessions.userId, targetUser.id),
          isNull(schema.userSessions.loggedOutAt)
        )
      );
  }

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'USERS',
    action: 'update',
    description: `Superadmin '${currentUser.username}' memperbarui akun user '${targetUser.username}' (Status: ${updateData.status || targetUser.status}).`,
    subjectId: targetUser.id,
    oldValues: oldValues,
    newValues: {
      ...oldValues,
      ...updateData,
      password: updateData.password ? '[UPDATED_SECRET]' : undefined,
    },
  });

  return {
    success: true,
    message: 'Data pengguna berhasil diperbarui.',
    data: {
      id: targetUser.id,
      username: updateData.username || targetUser.username,
      status: updateData.status || targetUser.status,
      isActive: updateData.isActive !== undefined ? updateData.isActive : targetUser.isActive,
      jobTitle: updateData.jobTitle !== undefined ? updateData.jobTitle : targetUser.jobTitle,
      department: updateData.department !== undefined ? updateData.department : targetUser.department,
    },
  };
});
