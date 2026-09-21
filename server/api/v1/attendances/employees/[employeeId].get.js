import { eq, and, or, gte, lte, asc, isNull } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';
import { evaluateDailyAttendance } from '~~/server/utils/attendance-calculator.js';

export default defineEventHandler(async (event) => {
  await requireAttendanceAccess(event, 'read');

  const employeeId = getRouterParam(event, 'employeeId') || event.context.params?.employeeId;
  const query = getQuery(event);

  if (!employeeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter employeeId wajib disertakan.',
    });
  }

  const now = new Date();
  const defaultPrevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYear = defaultPrevDate.getFullYear();
  const defaultMonth = defaultPrevDate.getMonth() + 1;

  const year = parseInt(query.year, 10) || defaultYear;
  const month = parseInt(query.month, 10) || defaultMonth;

  const employeeRows = await db
    .select({
      id: schema.employees.id,
      nip: schema.employees.nip,
      name: schema.employees.name,
      positionName: schema.positions.name,
      departmentName: schema.departments.name,
    })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .where(
      and(
        isNull(schema.employees.deletedAt),
        or(eq(schema.employees.id, employeeId), eq(schema.employees.nip, employeeId))
      )
    )
    .limit(1);

  const employee = employeeRows[0];
  if (!employee) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Data pegawai tidak ditemukan.',
    });
  }

  const resolvedEmployeeId = employee.id;
  const padMonth = String(month).padStart(2, '0');
  const startDateStr = `${year}-${padMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`;

  const attendanceLogs = await db
    .select()
    .from(schema.attendances)
    .where(
      and(
        eq(schema.attendances.employeeId, resolvedEmployeeId),
        gte(schema.attendances.attendanceDate, startDateStr),
        lte(schema.attendances.attendanceDate, endDateStr)
      )
    )
    .orderBy(asc(schema.attendances.attendanceDate));

  const summaryRows = await db
    .select()
    .from(schema.attendanceSummaries)
    .where(
      and(
        eq(schema.attendanceSummaries.employeeId, resolvedEmployeeId),
        eq(schema.attendanceSummaries.periodYear, year),
        eq(schema.attendanceSummaries.periodMonth, month)
      )
    )
    .limit(1);

  const summary = summaryRows[0] || null;

  const formattedLogs = attendanceLogs.map((log) => {
    const evalResult = evaluateDailyAttendance({
      attendanceType: log.attendanceType,
      checkinAt: log.checkinAt,
      checkoutAt: log.checkoutAt,
      checkinLocation: log.checkinLocation,
      checkoutLocation: log.checkoutLocation,
      status: log.status,
    });

    let verifikasiDisplay = 'Menunggu';
    if (log.status === 'approved') verifikasiDisplay = 'Disetujui';
    else if (log.status === 'rejected') verifikasiDisplay = 'Ditolak';

    let kehadiranLabel = 'Hadir';
    if (log.attendanceType === 'cuti') kehadiranLabel = 'Cuti';
    else if (log.attendanceType === 'izin') kehadiranLabel = 'Izin';
    else if (log.attendanceType === 'sakit') kehadiranLabel = 'Sakit';
    else if (log.attendanceType === 'tanpa_keterangan') kehadiranLabel = 'Tanpa Keterangan';

    return {
      id: log.id,
      tgl: log.attendanceDate,
      lokasi_checkin: log.checkinLocation || '-',
      lokasi_checkout: log.checkoutLocation || '-',
      kehadiran: kehadiranLabel,
      attendance_type: log.attendanceType,
      checkin_at: log.checkinAt || '-',
      checkout_at: log.checkoutAt || '-',
      durasi_hadir: Number(evalResult.durationHours.toFixed(1)),
      status: evalResult.statusHarian,
      status_raw: evalResult.statusHarian,
      failure_reason: evalResult.failureReason,
      is_late: evalResult.isLate,
      is_late_half_day: evalResult.isLateMoreThan15,
      verifikasi: verifikasiDisplay,
      verifikasi_raw: log.status,
      verifikator: log.verifiedByRole || '-',
      keterangan: log.remarks || '-',
    };
  });

  return {
    status: 'success',
    employee: {
      id: employee.id,
      nip: employee.nip,
      nama: employee.name,
      jabatan: employee.positionName || '-',
      departemen: employee.departmentName || '-',
    },
    period: {
      year,
      month,
    },
    summary: summary
      ? {
          hadir: Number(Number(summary.hadir || 0).toFixed(1)),
          status_hadir: summary.statusHadir,
          cuti: Number(Number(summary.cuti || 0).toFixed(1)),
          izin: Number(Number(summary.izin || 0).toFixed(1)),
          sakit: Number(Number(summary.sakit || 0).toFixed(1)),
          unpaid_leave: Number(Number(summary.unpaidLeave || 0).toFixed(1)),
          kuota_cuti: 12.0,
          kuota_izin: 3.0,
          kuota_unpaid_leave: 5.0,
        }
      : null,
    data: formattedLogs,
  };
});
