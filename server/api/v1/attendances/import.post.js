import * as XLSX from 'xlsx';
import { uuidv7 } from 'uuidv7';
import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';
import { evaluateDailyAttendance, recalculateMonthlySummary } from '~~/server/utils/attendance-calculator.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

function formatTimeVal(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (!str) return null;
  const parts = str.split(':');
  if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  if (parts.length >= 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  return str;
}

function formatDateVal(val, defaultYear, defaultMonth) {
  if (!val) return null;
  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    const y = jsDate.getUTCFullYear();
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
    const p = str.split(/[\/-]/);
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const dayNum = parseInt(str, 10);
  if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && defaultYear && defaultMonth) {
    return `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  }
  return str;
}

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireAttendanceAccess(event, 'create');

  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Form upload berkas tidak boleh kosong.',
    });
  }

  let filePart = null;
  let periodYear = null;
  let periodMonth = null;

  for (const part of formData) {
    if (part.name === 'file') {
      filePart = part;
    } else if (part.name === 'period_year' || part.name === 'year') {
      periodYear = parseInt(part.data.toString(), 10);
    } else if (part.name === 'period_month' || part.name === 'month') {
      periodMonth = parseInt(part.data.toString(), 10);
    }
  }

  if (!filePart || !filePart.data || filePart.data.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Berkas file presensi (.xlsx / .csv) wajib diunggah.',
    });
  }

  const filename = filePart.filename || 'import_presensi.xlsx';
  const lowerName = filename.toLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.csv')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Format berkas harus berupa Excel (.xlsx, .xls) atau CSV (.csv).',
    });
  }

  const now = new Date();
  const defaultPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const resolvedYear = periodYear || defaultPrev.getFullYear();
  const resolvedMonth = periodMonth || (defaultPrev.getMonth() + 1);

  const importId = uuidv7();

  await db.insert(schema.attendanceImports).values({
    id: importId,
    originalFilename: filename,
    filePath: `/uploads/attendance/${resolvedYear}/${String(resolvedMonth).padStart(2, '0')}/${filename}`,
    periodYear: resolvedYear,
    periodMonth: resolvedMonth,
    status: 'queued',
    totalRows: 0,
    processedRows: 0,
    importedBy: currentUser.id,
  });

  try {
    const workbook = XLSX.read(filePart.data, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      await db.update(schema.attendanceImports)
        .set({ status: 'failed', errorMessage: 'Berkas kosong / tidak ada data baris.' })
        .where(eq(schema.attendanceImports.id, importId));

      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Berkas spreadsheet tidak memuat baris data.',
      });
    }

    const allEmployees = await db.query.employees?.findMany?.({
      where: (tbl, { isNull: isNullOp }) => isNullOp(tbl.deletedAt),
    });
    const empByNip = new Map();
    for (const emp of allEmployees) {
      empByNip.set(emp.nip.trim(), emp);
    }

    await db.update(schema.attendanceImports)
      .set({ status: 'processing', totalRows: rawRows.length })
      .where(eq(schema.attendanceImports.id, importId));

    let processedCount = 0;
    const affectedEmployees = new Set();

    for (const row of rawRows) {
      const nip = String(row['NIP'] || row['nip'] || row['Nip'] || '').trim();
      const rawDate = row['Tanggal'] || row['tanggal'] || row['Tgl'] || row['Date'];
      const rawInTime = row['Jam Masuk'] || row['jam_masuk'] || row['Checkin'] || row['checkin_at'];
      const rawOutTime = row['Jam Pulang'] || row['jam_pulang'] || row['Checkout'] || row['checkout_at'];
      const rawInLoc = row['Lokasi Masuk'] || row['lokasi_masuk'] || row['Lokasi Checkin'] || row['checkin_location'];
      const rawOutLoc = row['Lokasi Pulang'] || row['lokasi_pulang'] || row['Lokasi Checkout'] || row['checkout_location'];
      const rawRemarks = row['Keterangan'] || row['keterangan'] || row['Remarks'] || row['remarks'] || '';

      if (!nip) continue;
      const employee = empByNip.get(nip);
      if (!employee) continue;

      const formattedDate = formatDateVal(rawDate, resolvedYear, resolvedMonth);
      if (!formattedDate) continue;

      const inTime = formatTimeVal(rawInTime);
      const outTime = formatTimeVal(rawOutTime);
      const inLoc = String(rawInLoc || '').trim();
      const outLoc = String(rawOutLoc || '').trim();
      const remarksStr = String(rawRemarks || '').trim();

      let attendanceType = 'hadir';
      const lowerRemarks = remarksStr.toLowerCase();
      if (lowerRemarks.includes('cuti')) attendanceType = 'cuti';
      else if (lowerRemarks.includes('izin')) attendanceType = 'izin';
      else if (lowerRemarks.includes('sakit')) attendanceType = 'sakit';
      else if (lowerRemarks.includes('tanpa') || lowerRemarks.includes('alpa')) attendanceType = 'tanpa_keterangan';
      else if (!inTime && !outTime) attendanceType = 'cuti';

      const evalResult = evaluateDailyAttendance({
        attendanceType,
        checkinAt: inTime,
        checkoutAt: outTime,
        checkinLocation: inLoc,
        checkoutLocation: outLoc,
        status: 'approved',
      });

      const attRecordId = uuidv7();

      await db.insert(schema.attendances).values({
        id: attRecordId,
        employeeId: employee.id,
        attendanceImportId: importId,
        attendanceDate: formattedDate,
        checkinAt: inTime,
        checkoutAt: outTime,
        checkinLocation: inLoc || null,
        checkoutLocation: outLoc || null,
        attendanceType,
        durationHours: evalResult.durationHours.toFixed(2),
        status: evalResult.statusHarian === 'Terpenuhi' ? 'approved' : 'rejected',
        verificationStatus: evalResult.statusHarian === 'Terpenuhi' ? 'valid' : 'invalid',
        verifiedByRole: 'Admin HRD',
        remarks: remarksStr || evalResult.failureReason,
      }).onDuplicateKeyUpdate({
        set: {
          attendanceImportId: importId,
          checkinAt: inTime,
          checkoutAt: outTime,
          checkinLocation: inLoc || null,
          checkoutLocation: outLoc || null,
          attendanceType,
          durationHours: evalResult.durationHours.toFixed(2),
          status: evalResult.statusHarian === 'Terpenuhi' ? 'approved' : 'rejected',
          verificationStatus: evalResult.statusHarian === 'Terpenuhi' ? 'valid' : 'invalid',
          verifiedByRole: 'Admin HRD',
          remarks: remarksStr || evalResult.failureReason,
          updatedAt: new Date(),
        },
      });

      processedCount++;
      affectedEmployees.add(employee.id);
    }

    for (const empId of affectedEmployees) {
      await recalculateMonthlySummary(empId, resolvedYear, resolvedMonth);
    }

    await db.update(schema.attendanceImports).set({
      status: 'completed',
      processedRows: processedCount,
      updatedAt: new Date(),
    }).where(eq(schema.attendanceImports.id, importId));

    await recordActivityLog(event, {
      userId: currentUser.id,
      moduleCode: 'ATTENDANCES',
      action: 'import',
      description: `Admin HRD berhasil mengimpor berkas presensi ${filename} (${processedCount} baris diproses)`,
      subjectId: importId,
      newValues: {
        filename,
        year: resolvedYear,
        month: resolvedMonth,
        totalRows: rawRows.length,
        processedRows: processedCount,
      },
    });

    setResponseStatus(event, 202);
    return {
      status: 'processing',
      message: 'File presensi berhasil diunggah dan selesai diproses di background.',
      import_job: {
        id: importId,
        filename,
        status: 'completed',
        total_rows: rawRows.length,
        processed_rows: processedCount,
        period_year: resolvedYear,
        period_month: resolvedMonth,
      },
    };
  } catch (err) {
    await db.update(schema.attendanceImports).set({
      status: 'failed',
      errorMessage: err.message || 'Kesalahan parsing spreadsheet.',
      updatedAt: new Date(),
    }).where(eq(schema.attendanceImports.id, importId));

    throw createError({
      statusCode: 400,
      statusMessage: `Bad Request: Gagal memproses file presensi: ${err.message}`,
    });
  }
});
