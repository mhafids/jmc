import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';
import { recalculateMonthlySummary } from '~~/server/utils/attendance-calculator.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireAttendanceAccess(event, 'delete');

  const attendanceId = getRouterParam(event, 'id');

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

  const { employeeId, attendanceDate } = existingAttendance;
  const dateObj = new Date(attendanceDate);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;

  await db.delete(schema.attendances).where(eq(schema.attendances.id, attendanceId));

  await recalculateMonthlySummary(employeeId, year, month);

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'ATTENDANCES',
    action: 'delete',
    description: `Menghapus catatan presensi pegawai ${existingAttendance.employee?.name || ''} tanggal ${attendanceDate}`,
    subjectId: attendanceId,
    oldValues: existingAttendance,
  });

  setResponseStatus(event, 204);
  return null;
});
