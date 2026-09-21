import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';
import { evaluateDailyAttendance, recalculateMonthlySummary } from '~~/server/utils/attendance-calculator.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireAttendanceAccess(event, 'update');

  const attendanceId = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!attendanceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: ID presensi wajib disertakan.',
    });
  }

  const existingAttendance = await db.query.attendances?.findFirst?.({
    where: (tbl, { eq: eqOp }) => eqOp(tbl.id, attendanceId),
    with: {
      employee: true,
    },
  });

  if (!existingAttendance) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Catatan presensi tidak ditemukan.',
    });
  }

  const attendanceType = (body.attendance_type || existingAttendance.attendanceType || 'hadir').toLowerCase();
  const checkinAt = body.checkin_at !== undefined ? body.checkin_at : existingAttendance.checkinAt;
  const checkoutAt = body.checkout_at !== undefined ? body.checkout_at : existingAttendance.checkoutAt;
  const checkinLocation = body.checkin_location !== undefined ? body.checkin_location : existingAttendance.checkinLocation;
  const checkoutLocation = body.checkout_location !== undefined ? body.checkout_location : existingAttendance.checkoutLocation;
  const status = body.status !== undefined ? body.status : existingAttendance.status;
  const verifiedByRole = body.verified_by_role !== undefined ? body.verified_by_role : existingAttendance.verifiedByRole;
  const remarks = body.remarks !== undefined ? body.remarks : existingAttendance.remarks;

  const evalResult = evaluateDailyAttendance({
    attendanceType,
    checkinAt,
    checkoutAt,
    checkinLocation,
    checkoutLocation,
    status,
  });

  await db
    .update(schema.attendances)
    .set({
      attendanceType,
      checkinAt,
      checkoutAt,
      checkinLocation,
      checkoutLocation,
      durationHours: evalResult.durationHours.toFixed(2),
      status,
      verificationStatus: status === 'approved' ? 'valid' : 'invalid',
      verifiedByRole,
      remarks: remarks || evalResult.failureReason,
      updatedAt: new Date(),
    })
    .where(eq(schema.attendances.id, attendanceId));

  const dateObj = new Date(existingAttendance.attendanceDate);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  await recalculateMonthlySummary(existingAttendance.employeeId, year, month);

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'ATTENDANCES',
    action: 'update',
    description: `Memperbarui / memverifikasi presensi ${existingAttendance.employee?.name || ''} tanggal ${existingAttendance.attendanceDate} (Status: ${evalResult.statusHarian})`,
    subjectId: attendanceId,
    oldValues: {
      type: existingAttendance.attendanceType,
      checkin: existingAttendance.checkinAt,
      checkout: existingAttendance.checkoutAt,
      status: existingAttendance.status,
    },
    newValues: {
      type: attendanceType,
      checkin: checkinAt,
      checkout: checkoutAt,
      status: status,
      duration: evalResult.durationHours,
    },
  });

  return {
    status: 'success',
    message: 'Data presensi berhasil diperbarui dan direkalkulasi.',
    data: {
      id: attendanceId,
      employee_id: existingAttendance.employeeId,
      attendance_date: existingAttendance.attendanceDate,
      duration_hours: evalResult.durationHours,
      status_harian: evalResult.statusHarian,
      failure_reason: evalResult.failureReason,
    },
  };
});
