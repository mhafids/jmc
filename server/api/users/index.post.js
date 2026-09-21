import crypto from 'node:crypto';
import argon2 from 'argon2';
import { eq, or, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireSuperadmin } from '~~/server/utils/user-auth-guard.js';
import { checkRateLimit } from '~~/server/utils/rate-limiter.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireSuperadmin(event);

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  checkRateLimit(`create_user:${clientIp}`, 20, 60000);

  const body = await readBody(event);
  const {
    employeeId,
    username,
    password,
    roleId,
    jobTitle,
    department,
    status = 'active',
  } = body || {};

  if (!employeeId || !username || !password || !roleId) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Data form belum lengkap. Pegawai, Username, Password, dan Role wajib diisi.',
    });
  }

  const cleanUsername = String(username).trim();
  const usernameRegex = /^[a-z0-9]{6,}$/;
  if (!usernameRegex.test(cleanUsername)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format username tidak valid. Username minimal 6 karakter, hanya boleh huruf kecil dan angka, tanpa spasi.',
    });
  }

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

  const employee = await db.query.employees?.findFirst?.({
    where: (tbl, { and, eq: eqCol, isNull: isNullCol }) =>
      and(eqCol(tbl.id, employeeId), isNullCol(tbl.deletedAt)),
  });

  if (!employee) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data pegawai yang dipilih tidak valid atau tidak terdaftar di sistem.',
    });
  }

  const existingUserWithEmp = await db.query.users?.findFirst?.({
    where: (tbl, { and, eq: eqCol, isNull: isNullCol }) =>
      and(eqCol(tbl.employeeId, employeeId), isNullCol(tbl.deletedAt)),
  });

  if (existingUserWithEmp) {
    throw createError({
      statusCode: 409,
      statusMessage: `Pegawai '${employee.name}' sudah memiliki akun aktif (Username: ${existingUserWithEmp.username}).`,
    });
  }

  const duplicateUser = await db.query.users?.findFirst?.({
    where: (tbl, { and, eq: eqCol, isNull: isNullCol }) =>
      and(eqCol(tbl.username, cleanUsername), isNullCol(tbl.deletedAt)),
  });

  if (duplicateUser) {
    throw createError({
      statusCode: 409,
      statusMessage: `Username '${cleanUsername}' sudah digunakan oleh pengguna lain.`,
    });
  }

  const salt = crypto.randomBytes(16);
  const hashedPassword = await argon2.hash(cleanPassword, {
    type: argon2.argon2id,
    salt,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const isUserActive = status === 'active';
  const newUserId = uuidv7();

  await db.insert(schema.users).values({
    id: newUserId,
    employeeId: employee.id,
    roleId: roleId,
    name: employee.name,
    username: cleanUsername,
    email: employee.email,
    cellphone: employee.phone || null,
    password: hashedPassword,
    status: isUserActive ? 'active' : 'inactive',
    isActive: isUserActive,
    jobTitle: jobTitle || null,
    department: department || null,
    passwordChangedAt: new Date(),
  });

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'USERS',
    action: 'create',
    description: `Superadmin '${currentUser.username}' membuat user baru '${cleanUsername}' untuk pegawai '${employee.name}'.`,
    subjectId: newUserId,
    newValues: {
      userId: newUserId,
      employeeId: employee.id,
      name: employee.name,
      username: cleanUsername,
      roleId: roleId,
      status: isUserActive ? 'active' : 'inactive',
    },
  });

  setResponseStatus(event, 201);
  return {
    success: true,
    message: 'Akun pengguna baru berhasil dibuat.',
    data: {
      id: newUserId,
      employeeId: employee.id,
      name: employee.name,
      username: cleanUsername,
      email: employee.email,
      roleId: roleId,
      status: isUserActive ? 'active' : 'inactive',
      isActive: isUserActive,
      jobTitle: jobTitle || null,
      department: department || null,
    },
  };
});
