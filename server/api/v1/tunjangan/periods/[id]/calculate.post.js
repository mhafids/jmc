import { eq, and, lte, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';
import { evaluateTransportAllowance } from '~~/server/utils/transport-calculator.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

const MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireTransportAccess(event, 'TRANSPORT_ALLOWANCES', 'create');

  const periodId = getRouterParam(event, 'id');
  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter ID periode wajib disertakan.',
    });
  }

  const period = await db.query.transportAllowancePeriods?.findFirst?.({
    where: (tbl) => eq(tbl.id, periodId),
  });

  if (!period) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Periode tunjangan transport tidak ditemukan.',
    });
  }

  if (period.status === 'locked') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Periode telah dikunci dan tidak dapat dihitung ulang.',
    });
  }

  const activeSetting = await db.query.transportAllowanceSettings?.findFirst?.({
    where: (tbl) => eq(tbl.isActive, true),
    orderBy: (tbl, { desc }) => [desc(tbl.effectiveStart), desc(tbl.createdAt)],
  });

  if (!activeSetting) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Pengaturan tarif dasar tunjangan transport aktif belum tersedia. Silakan atur di Setting Tunjangan terlebih dahulu.',
    });
  }

  const employeesList = await db
    .select({
      id: schema.employees.id,
      nip: schema.employees.nip,
      name: schema.employees.name,
      employmentType: schema.employees.employmentType,
      distanceKm: schema.employees.distanceKm,
      status: schema.employees.status,
      joinedAt: schema.employees.joinedAt,
    })
    .from(schema.employees)
    .where(
      and(
        eq(schema.employees.status, 'active'),
        isNull(schema.employees.deletedAt)
      )
    );

  if (employeesList.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Tidak ada data pegawai aktif untuk diproses kalkulasi.',
    });
  }

  const summaries = await db
    .select({
      employeeId: schema.attendanceSummaries.employeeId,
      hadir: schema.attendanceSummaries.hadir,
    })
    .from(schema.attendanceSummaries)
    .where(
      and(
        eq(schema.attendanceSummaries.periodYear, period.periodYear),
        eq(schema.attendanceSummaries.periodMonth, period.periodMonth)
      )
    );

  const summaryMap = new Map();
  for (const s of summaries) {
    summaryMap.set(s.employeeId, Number(s.hadir || 0));
  }

  const detailInserts = [];
  let totalRecipients = 0;
  let totalAmount = 0;

  for (const emp of employeesList) {
    let attendanceDays = summaryMap.has(emp.id) ? summaryMap.get(emp.id) : 0;

    const result = evaluateTransportAllowance({
      employee: emp,
      attendanceDays,
      setting: activeSetting,
    });

    if (result.isEligible && result.nominal > 0) {
      totalRecipients += 1;
      totalAmount += result.nominal;
    }

    detailInserts.push({
      id: uuidv7(),
      transportAllowancePeriodId: period.id,
      employeeId: emp.id,
      baseFare: String(result.baseFare),
      originalKm: String(result.originalKm),
      roundedKm: result.roundedKm,
      attendanceDays: result.attendanceDays,
      nominal: String(result.nominal),
      eligibilityStatus: result.eligibilityStatus,
      calculationNote: result.calculationNote,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db
    .delete(schema.transportAllowanceDetails)
    .where(eq(schema.transportAllowanceDetails.transportAllowancePeriodId, period.id));

  if (detailInserts.length > 0) {
    await db.insert(schema.transportAllowanceDetails).values(detailInserts);
  }

  const now = new Date();
  await db
    .update(schema.transportAllowancePeriods)
    .set({
      totalRecipients,
      totalAmount: String(totalAmount),
      status: 'calculated',
      calculatedBy: currentUser.id,
      calculatedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.transportAllowancePeriods.id, period.id));

  const bulanName = MONTH_NAMES[period.periodMonth] || `Bulan ${period.periodMonth}`;
  const formattedNominal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(totalAmount);

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'TRANSPORT_ALLOWANCES',
    action: 'create',
    description: `Menghitung tunjangan transport periode ${bulanName} ${period.periodYear} (Total Penerima: ${totalRecipients}, Total: ${formattedNominal}).`,
    subjectId: period.id,
    newValues: {
      periodId: period.id,
      periodYear: period.periodYear,
      periodMonth: period.periodMonth,
      totalRecipients,
      totalAmount,
      status: 'calculated',
    },
  });

  return {
    status: 'success',
    message: `Kalkulasi tunjangan transport periode ${bulanName} ${period.periodYear} berhasil diselesaikan.`,
    data: {
      id: period.id,
      period_year: period.periodYear,
      period_month: period.periodMonth,
      bulan: bulanName,
      total_recipients: totalRecipients,
      total_amount: totalAmount,
      status: 'calculated',
      calculated_at: now,
    },
  };
});
