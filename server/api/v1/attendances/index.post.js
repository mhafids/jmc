import { uuidv7 } from 'uuidv7';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';
import { evaluateDailyAttendance, recalculateMonthlySummary } from '~~/server/utils/attendance-calculator.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireAttendanceAccess(event, 'create');

  const body = await readBody(event);

  if (!body || !body.employee_id || !body.attendance_date) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: employee_id dan attendance_date wajib diisi.',
    });
  }

  const employee = await db.query.employees?.findFirst?.({
    where: (tbl, { eq: eqOp }) => eqOp(tbl.id, body.employee_id),
  });

  if (!employee) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Pegawai tidak ditemukan.',
    });
  }

  const attendanceType = (body.attendance_type || 'hadir').toLowerCase();
  const checkinAt = body.checkin_at || (attendanceType === 'hadir' ? '08:00:00' : null);
  const checkoutAt = body.checkout_at || (attendanceType === 'hadir' ? '17:00:00' : null);
  const checkinLocation = body.checkin_location || (attendanceType === 'hadir' ? 'Gedung Utama' : null);
  const checkoutLocation = body.checkout_location || (attendanceType === 'hadir' ? 'Gedung Utama' : null);
  const status = body.status || 'approved';
  const verifiedByRole = body.verified_by_role || 'HRD';
  const remarks = body.remarks || null;

  const evalResult = evaluateDailyAttendance({
    attendanceType,
    checkinAt,
    checkoutAt,
    checkinLocation,
    checkoutLocation,
    status,
  });

  const attendanceId = uuidv7();
  const dateObj = new Date(body.attendance_date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  await db.insert(schema.attendances).values({
    id: attendanceId,
    employeeId: body.employee_id,
    attendanceDate: body.attendance_date,
    checkinAt,
    checkoutAt,
    checkinLocation,
    checkoutLocation,
    attendanceType,
    durationHours: evalResult.durationHours.toFixed(2),
    status,
    verificationStatus: status === 'approved' ? 'valid' : 'invalid',
    verifiedByRole,
    remarks: remarks || evalResult.failureReason,
  }).onDuplicateKeyUpdate({
    set: {
      checkinAt,
      checkoutAt,
      checkinLocation,
      checkoutLocation,
      attendanceType,
      durationHours: evalResult.durationHours.toFixed(2),
      status,
      verificationStatus: status === 'approved' ? 'valid' : 'invalid',
      verifiedByRole,
      remarks: remarks || evalResult.failureReason,
      updatedAt: new Date(),
    },
  });

  await recalculateMonthlySummary(body.employee_id, year, month);

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'ATTENDANCES',
    action: 'create',
    description: `Menambahkan presensi pegawai ${employee.name} tanggal ${body.attendance_date} (Status: ${evalResult.statusHarian})`,
    subjectId: attendanceId,
    newValues: {
      employeeId: body.employee_id,
      date: body.attendance_date,
      type: attendanceType,
      duration: evalResult.durationHours,
      status: evalResult.statusHarian,
    },
  });

  setResponseStatus(event, 201);
  return {
    status: 'success',
    message: 'Data presensi harian berhasil dicatat.',
    data: {
      id: attendanceId,
      employee_id: body.employee_id,
      attendance_date: body.attendance_date,
      duration_hours: evalResult.durationHours,
      status_harian: evalResult.statusHarian,
      is_late: evalResult.isLate,
      failure_reason: evalResult.failureReason,
    },
  };
});
