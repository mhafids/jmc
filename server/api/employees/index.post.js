import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';
import { checkRateLimit } from '~~/server/utils/rate-limiter.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireEmployeeAccess(event, 'create');

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  checkRateLimit(`create_employee:${clientIp}`, 30, 60000);

  const body = await readBody(event);
  const {
    nip,
    name,
    email,
    phone,
    photoPath,
    birthPlace,
    birthDate,
    maritalStatus = 'single',
    childrenCount = 0,
    joinedAt,
    positionId,
    departmentId,
    employmentType = 'tetap',
    gender = 'male',
    districtId,
    fullAddress,
    distanceKm = 0,
    status = 'active',
    educations = [],
  } = body || {};

  if (!nip || !name || !email || !phone || !birthPlace || !birthDate || !joinedAt || !positionId || !departmentId) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Kolom wajib belum lengkap. NIP, Nama, Email, Nomor HP, Tempat/Tanggal Lahir, Tanggal Masuk, Jabatan, dan Departemen wajib diisi.',
    });
  }

  const cleanNip = String(nip).trim();
  if (!/^\d{8,}$/.test(cleanNip)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: NIP harus minimal 8 digit angka numerik tanpa spasi.',
    });
  }

  const cleanName = String(name).trim();
  if (!/^[a-zA-Z0-9\s'.]+$/.test(cleanName)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request: Nama hanya boleh memuat huruf, angka, spasi, tanda titik, dan tanda petik satu (').",
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Format email tidak valid.',
    });
  }

  const cleanPhone = String(phone).trim();
  if (!/^\+62\d{8,14}$/.test(cleanPhone)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Nomor HP wajib menggunakan format internasional diawali +62 (contoh: +6281234567890).',
    });
  }

  const parsedDistance = parseFloat(distanceKm);
  if (isNaN(parsedDistance) || parsedDistance < 0 || parsedDistance > 99.99) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Jarak rumah-kantor maksimal 2 digit integer (0 s/d 99.99 km).',
    });
  }

  const isMarried = maritalStatus === 'married' || maritalStatus === 'kawin';
  const cleanChildrenCount = isMarried ? Math.max(0, Math.min(99, parseInt(childrenCount) || 0)) : 0;

  if (!Array.isArray(educations) || educations.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Riwayat pendidikan wajib diisi minimal satu (1) jenjang.',
    });
  }

  for (const edu of educations) {
    if (!edu.educationLevel || !edu.schoolName || !edu.graduationYear) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Setiap baris riwayat pendidikan wajib memuat Jenjang, Nama Sekolah, dan Tahun Kelulusan.',
      });
    }
  }

  const existingNip = await db.query.employees?.findFirst?.({
    where: (tbl, { and, eq, isNull }) => and(eq(tbl.nip, cleanNip), isNull(tbl.deletedAt)),
  });
  if (existingNip) {
    throw createError({
      statusCode: 409,
      statusMessage: `Conflict: Pegawai dengan NIP '${cleanNip}' sudah terdaftar dalam sistem.`,
    });
  }

  const existingEmail = await db.query.employees?.findFirst?.({
    where: (tbl, { and, eq, isNull }) => and(eq(tbl.email, cleanEmail), isNull(tbl.deletedAt)),
  });
  if (existingEmail) {
    throw createError({
      statusCode: 409,
      statusMessage: `Conflict: Email '${cleanEmail}' sudah digunakan oleh data pegawai lain.`,
    });
  }

  const newEmployeeId = uuidv7();

  await db.transaction(async (tx) => {
    await tx.insert(schema.employees).values({
      id: newEmployeeId,
      nip: cleanNip,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      photoPath: photoPath || null,
      birthPlace: String(birthPlace).trim(),
      birthDate: new Date(birthDate),
      maritalStatus: isMarried ? 'married' : 'single',
      childrenCount: cleanChildrenCount,
      joinedAt: new Date(joinedAt),
      positionId,
      departmentId,
      employmentType,
      gender,
      districtId: districtId || null,
      fullAddress: fullAddress ? String(fullAddress).trim() : null,
      distanceKm: parsedDistance.toFixed(2),
      status: status === 'inactive' ? 'inactive' : 'active',
      createdBy: currentUser.id,
      updatedBy: currentUser.id,
    });

    let order = 0;
    for (const edu of educations) {
      await tx.insert(schema.employeeEducations).values({
        id: uuidv7(),
        employeeId: newEmployeeId,
        educationLevel: String(edu.educationLevel).trim(),
        schoolName: String(edu.schoolName).trim(),
        graduationYear: parseInt(edu.graduationYear) || new Date().getFullYear(),
        sortOrder: order++,
      });
    }
  });

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'EMPLOYEES',
    action: 'create',
    description: `Menambahkan data pegawai baru '${cleanName}' (NIP: ${cleanNip})`,
    subjectId: newEmployeeId,
    newValues: {
      nip: cleanNip,
      name: cleanName,
      email: cleanEmail,
      positionId,
      departmentId,
    },
  });

  return {
    success: true,
    message: 'Data pegawai dan riwayat pendidikan berhasil ditambahkan.',
    data: {
      id: newEmployeeId,
      nip: cleanNip,
      name: cleanName,
    },
  };
});
