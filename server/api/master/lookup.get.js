import { isNull, asc } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';

export default defineEventHandler(async (event) => {
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

  const currentUser = await db.query.users?.findFirst?.({
    where: (tbl, { eq }) => eq(tbl.id, payload.userId),
  });

  if (!currentUser || !currentUser.isActive || currentUser.deletedAt) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Akun tidak aktif atau tidak ditemukan.',
    });
  }

  const positionsList = await db
    .select({
      id: schema.positions.id,
      code: schema.positions.code,
      name: schema.positions.name,
      positionType: schema.positions.positionType,
    })
    .from(schema.positions)
    .orderBy(asc(schema.positions.name));

  const departmentsList = await db
    .select({
      id: schema.departments.id,
      code: schema.departments.code,
      name: schema.departments.name,
      sortOrder: schema.departments.sortOrder,
    })
    .from(schema.departments)
    .orderBy(asc(schema.departments.sortOrder), asc(schema.departments.name));

  const rolesList = await db
    .select({
      id: schema.roles.id,
      code: schema.roles.code,
      name: schema.roles.name,
      description: schema.roles.description,
    })
    .from(schema.roles)
    .where(isNull(schema.roles.deletedAt))
    .orderBy(asc(schema.roles.name));

  return {
    success: true,
    data: {
      positions: positionsList,
      departments: departmentsList,
      roles: rolesList,
      officeLocations: ['Gedung Utama', 'Gedung A', 'Gedung B'],
      attendanceTypes: [
        { value: 'hadir', label: 'Hadir' },
        { value: 'cuti', label: 'Cuti' },
        { value: 'izin', label: 'Izin' },
        { value: 'sakit', label: 'Sakit' },
        { value: 'tanpa_keterangan', label: 'Tanpa Keterangan' },
      ],
      verificationRoles: ['HRD', 'Lead', 'Manager'],
      verificationStatuses: [
        { value: 'approved', label: 'Disetujui' },
        { value: 'rejected', label: 'Ditolak' },
        { value: 'pending', label: 'Menunggu' },
      ],
    },
  };
});
