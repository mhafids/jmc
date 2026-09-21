import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';

export function normalizeLocation(loc) {
  if (!loc) return '';
  const trimmed = loc.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('utama')) return 'Gedung Utama';
  if (lower.includes('gedung a') || lower === 'a') return 'Gedung A';
  if (lower.includes('gedung b') || lower === 'b') return 'Gedung B';
  return trimmed;
}

export function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.toString().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function evaluateDailyAttendance(params) {
  const type = (params.attendanceType || 'hadir').toLowerCase();
  const approvalStatus = (params.status || 'pending').toLowerCase();

  if (type !== 'hadir') {
    if (approvalStatus === 'rejected' || type === 'tanpa_keterangan') {
      return {
        durationHours: 0.0,
        statusHarian: 'Tidak terpenuhi',
        dayWeight: 0.0,
        isLate: false,
        isLateMoreThan15: false,
        failureReason: type === 'tanpa_keterangan' ? 'Tanpa keterangan' : 'Pengajuan ditolak verifikator',
      };
    }

    return {
      durationHours: 0.0,
      statusHarian: 'Terpenuhi',
      dayWeight: 0.0,
      isLate: false,
      isLateMoreThan15: false,
      failureReason: null,
    };
  }

  const normInLoc = normalizeLocation(params.checkinLocation);
  const normOutLoc = normalizeLocation(params.checkoutLocation);

  if (!normInLoc || !normOutLoc || normInLoc !== normOutLoc) {
    return {
      durationHours: 0.0,
      statusHarian: 'Tidak terpenuhi',
      dayWeight: 0.0,
      isLate: false,
      isLateMoreThan15: false,
      failureReason: `Lokasi check-in (${params.checkinLocation || '-'}) berbeda dengan check-out (${params.checkoutLocation || '-'})`,
    };
  }

  const checkinMin = timeToMinutes(params.checkinAt);
  const checkoutMin = timeToMinutes(params.checkoutAt);

  if (checkinMin === null || checkoutMin === null || checkoutMin <= checkinMin) {
    return {
      durationHours: 0.0,
      statusHarian: 'Tidak terpenuhi',
      dayWeight: 0.0,
      isLate: false,
      isLateMoreThan15: false,
      failureReason: 'Format jam check-in / check-out tidak valid atau jam pulang mendahului jam masuk',
    };
  }

  const grossMinutes = checkoutMin - checkinMin;

  let breakMinutes = 0;
  const breakStart = 12 * 60;
  const breakEnd = 13 * 60;
  if (checkinMin <= breakStart && checkoutMin >= breakEnd) {
    breakMinutes = 60;
  } else if (checkinMin < breakEnd && checkoutMin > breakStart) {
    const overlapStart = Math.max(checkinMin, breakStart);
    const overlapEnd = Math.min(checkoutMin, breakEnd);
    breakMinutes = Math.max(0, overlapEnd - overlapStart);
  }

  const cleanMinutes = Math.max(0, grossMinutes - breakMinutes);
  const cleanHours = Math.round((cleanMinutes / 60) * 10) / 10;

  const isLate = checkinMin > 8 * 60;
  const isLateMoreThan15 = checkinMin > 8 * 60 + 15;

  if (approvalStatus === 'rejected') {
    return {
      durationHours: 0.0,
      statusHarian: 'Tidak terpenuhi',
      dayWeight: 0.0,
      isLate,
      isLateMoreThan15,
      failureReason: 'Presensi ditolak oleh verifikator',
    };
  }

  if (cleanHours < 8.0) {
    return {
      durationHours: 0.0,
      statusHarian: 'Tidak terpenuhi',
      dayWeight: 0.0,
      isLate,
      isLateMoreThan15,
      failureReason: `Durasi kerja bersih (${cleanHours.toFixed(1)} jam) kurang dari syarat minimal 8.0 jam`,
    };
  }

  if (isLateMoreThan15) {
    return {
      durationHours: cleanHours,
      statusHarian: 'Terpenuhi',
      dayWeight: 0.5,
      isLate,
      isLateMoreThan15: true,
      failureReason: null,
    };
  }

  return {
    durationHours: cleanHours,
    statusHarian: 'Terpenuhi',
    dayWeight: 1.0,
    isLate,
    isLateMoreThan15: false,
    failureReason: null,
  };
}

export async function recalculateMonthlySummary(employeeId, year, month) {
  const padMonth = String(month).padStart(2, '0');
  const startDateStr = `${year}-${padMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`;

  const records = await db
    .select()
    .from(schema.attendances)
    .where(
      and(
        eq(schema.attendances.employeeId, employeeId),
        gte(schema.attendances.attendanceDate, startDateStr),
        lte(schema.attendances.attendanceDate, endDateStr)
      )
    );

  let totalHadir = 0.0;
  let totalCuti = 0.0;
  let totalIzin = 0.0;
  let totalSakit = 0.0;
  let totalLate = 0;
  let totalUnpaidLeave = 0.0;

  for (const rec of records) {
    const evalResult = evaluateDailyAttendance({
      attendanceType: rec.attendanceType,
      checkinAt: rec.checkinAt,
      checkoutAt: rec.checkoutAt,
      checkinLocation: rec.checkinLocation,
      checkoutLocation: rec.checkoutLocation,
      status: rec.status,
    });

    if (rec.attendanceType === 'hadir') {
      if (evalResult.statusHarian === 'Terpenuhi') {
        totalHadir += evalResult.dayWeight;
      }
      if (evalResult.isLate) {
        totalLate += 1;
      }
    } else if (rec.attendanceType === 'cuti') {
      if (rec.status !== 'rejected') totalCuti += 1.0;
    } else if (rec.attendanceType === 'izin') {
      if (rec.status !== 'rejected') totalIzin += 1.0;
    } else if (rec.attendanceType === 'sakit') {
      if (rec.status !== 'rejected') totalSakit += 1.0;
    } else if (rec.attendanceType === 'tanpa_keterangan') {
      totalUnpaidLeave += 1.0;
    }
  }

  const statusHadir = totalHadir >= 19.0 ? 'Terpenuhi' : 'Tidak terpenuhi';

  const existingSummary = await db.query.attendanceSummaries?.findFirst?.({
    where: (tbl, { and: andOp, eq: eqOp }) =>
      andOp(
        eqOp(tbl.employeeId, employeeId),
        eqOp(tbl.periodYear, year),
        eqOp(tbl.periodMonth, month)
      ),
  });

  const summaryValues = {
    employeeId,
    periodYear: year,
    periodMonth: month,
    hadir: totalHadir.toFixed(1),
    cuti: totalCuti.toFixed(1),
    izin: totalIzin.toFixed(1),
    sakit: totalSakit.toFixed(1),
    hadirLate: totalLate,
    unpaidLeave: totalUnpaidLeave.toFixed(1),
    hadirUnpaidLeave: '0.0',
    statusHadir: statusHadir,
    calculatedAt: new Date(),
    updatedAt: new Date(),
  };

  if (existingSummary) {
    await db
      .update(schema.attendanceSummaries)
      .set(summaryValues)
      .where(eq(schema.attendanceSummaries.id, existingSummary.id));
  } else {
    await db.insert(schema.attendanceSummaries).values({
      id: uuidv7(),
      ...summaryValues,
    });
  }

  return {
    employeeId,
    year,
    month,
    hadir: totalHadir,
    cuti: totalCuti,
    izin: totalIzin,
    sakit: totalSakit,
    hadirLate: totalLate,
    unpaidLeave: totalUnpaidLeave,
    statusHadir,
  };
}
