import { eq, or, isNull, and, ne } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';
import { checkRateLimit } from '~~/server/utils/rate-limiter.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireEmployeeAccess(event, 'update');

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  checkRateLimit(`update_employee:${clientIp}`, 60, 60000);

  const identifier = getRouterParam(event, 'id');
  if (!identifier) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter ID pegawai diperlukan.',
    });
  }

  const existingEmployee = await db.query.employees?.findFirst?.({
    where: (tbl, { and, eq, isNull, or }) =>
      and(isNull(tbl.deletedAt), or(eq(tbl.id, identifier), eq(tbl.nip, identifier))),
  });

  if (!existingEmployee) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Data pegawai tidak ditemukan.',
    });
  }

  const employeeId = existingEmployee.id;
  const body = await readBody(event);
  const {
    nip,
    name,
    email,
    phone,
    photoPath,
    birthPlace,
    birthDate,
    maritalStatus,
    childrenCount,
    joinedAt,
    positionId,
    departmentId,
    employmentType,
    gender,
    districtId,
    fullAddress,
    distanceKm,
    status,
    educations,
  } = body || {};

  let cleanNip = existingEmployee.nip;
  if (nip) {
    cleanNip = String(nip).trim();
    if (!/^\d{8,}$/.test(cleanNip)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: NIP harus minimal 8 digit angka numerik tanpa spasi.',
      });
    }

    const duplicateNip = await db.query.employees?.findFirst?.({
      where: (tbl, { and, eq, isNull, ne }) =>
        and(eq(tbl.nip, cleanNip), ne(tbl.id, employeeId), isNull(tbl.deletedAt)),
    });
    if (duplicateNip) {
      throw createError({
        statusCode: 409,
        statusMessage: `Conflict: NIP '${cleanNip}' sudah digunakan oleh pegawai lain.`,
      });
    }
  }

  let cleanEmail = existingEmployee.email;
  if (email) {
    cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Format email tidak valid.',
      });
    }

    const duplicateEmail = await db.query.employees?.findFirst?.({
      where: (tbl, { and, eq, isNull, ne }) =>
        and(eq(tbl.email, cleanEmail), ne(tbl.id, employeeId), isNull(tbl.deletedAt)),
    });
    if (duplicateEmail) {
      throw createError({
        statusCode: 409,
        statusMessage: `Conflict: Email '${cleanEmail}' sudah digunakan oleh pegawai lain.`,
      });
    }
  }

  let cleanName = existingEmployee.name;
  if (name) {
    cleanName = String(name).trim();
    if (!/^[a-zA-Z0-9\s'.]+$/.test(cleanName)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request: Nama hanya boleh memuat huruf, angka, spasi, titik, dan petik tunggal (').",
      });
    }
  }

  let cleanPhone = existingEmployee.phone;
  if (phone) {
    cleanPhone = String(phone).trim();
    if (!/^\+62\d{8,14}$/.test(cleanPhone)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Nomor HP wajib menggunakan format internasional diawali +62.',
      });
    }
  }

  let cleanDistance = existingEmployee.distanceKm;
  if (distanceKm !== undefined && distanceKm !== null && distanceKm !== '') {
    const parsedDistance = parseFloat(distanceKm);
    if (isNaN(parsedDistance) || parsedDistance < 0 || parsedDistance > 99.99) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Jarak rumah-kantor maksimal 2 digit integer (0 s/d 99.99 km).',
      });
    }
    cleanDistance = parsedDistance.toFixed(2);
  }

  const isMarried = (maritalStatus || existingEmployee.maritalStatus) === 'married' || (maritalStatus || existingEmployee.maritalStatus) === 'kawin';
  const cleanChildren = isMarried ? Math.max(0, Math.min(99, parseInt(childrenCount !== undefined ? childrenCount : existingEmployee.childrenCount) || 0)) : 0;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.employees)
      .set({
        nip: cleanNip,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        photoPath: photoPath !== undefined ? photoPath : existingEmployee.photoPath,
        birthPlace: birthPlace !== undefined ? String(birthPlace).trim() : existingEmployee.birthPlace,
        birthDate: birthDate ? new Date(birthDate) : existingEmployee.birthDate,
        maritalStatus: isMarried ? 'married' : 'single',
        childrenCount: cleanChildren,
        joinedAt: joinedAt ? new Date(joinedAt) : existingEmployee.joinedAt,
        positionId: positionId || existingEmployee.positionId,
        departmentId: departmentId || existingEmployee.departmentId,
        employmentType: employmentType || existingEmployee.employmentType,
        gender: gender || existingEmployee.gender,
        districtId: districtId !== undefined ? (districtId || null) : existingEmployee.districtId,
        fullAddress: fullAddress !== undefined ? (fullAddress ? String(fullAddress).trim() : null) : existingEmployee.fullAddress,
        distanceKm: cleanDistance,
        status: status || existingEmployee.status,
        updatedBy: currentUser.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.employees.id, employeeId));

    if (Array.isArray(educations)) {
      await tx
        .delete(schema.employeeEducations)
        .where(eq(schema.employeeEducations.employeeId, employeeId));

      let order = 0;
      for (const edu of educations) {
        if (!edu.educationLevel || !edu.schoolName || !edu.graduationYear) continue;
        await tx.insert(schema.employeeEducations).values({
          id: uuidv7(),
          employeeId: employeeId,
          educationLevel: String(edu.educationLevel).trim(),
          schoolName: String(edu.schoolName).trim(),
          graduationYear: parseInt(edu.graduationYear) || new Date().getFullYear(),
          sortOrder: order++,
        });
      }
    }
  });

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'EMPLOYEES',
    action: 'update',
    description: `Memperbarui data pegawai '${cleanName}' (${cleanNip})`,
    subjectId: employeeId,
    oldValues: {
      nip: existingEmployee.nip,
      name: existingEmployee.name,
      email: existingEmployee.email,
      status: existingEmployee.status,
    },
    newValues: {
      nip: cleanNip,
      name: cleanName,
      email: cleanEmail,
      status: status || existingEmployee.status,
    },
  });

  return {
    success: true,
    message: 'Data pegawai berhasil diperbarui.',
    data: {
      id: employeeId,
      nip: cleanNip,
      name: cleanName,
    },
  };
});
