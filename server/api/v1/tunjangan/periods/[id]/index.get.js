import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';

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
  await requireTransportAccess(event, 'TRANSPORT_ALLOWANCES', 'read');

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter ID periode wajib disertakan.',
    });
  }

  const period = await db.query.transportAllowancePeriods?.findFirst?.({
    where: (tbl) => eq(tbl.id, id),
    with: {
      calculator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!period) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Periode tunjangan transport tidak ditemukan.',
    });
  }

  const bulanName = MONTH_NAMES[period.periodMonth] || `Bulan ${period.periodMonth}`;

  return {
    status: 'success',
    data: {
      id: period.id,
      period_year: period.periodYear,
      period_month: period.periodMonth,
      bulan: bulanName,
      title: `Bulan ${bulanName} ${period.periodYear}`,
      total_recipients: Number(period.totalRecipients || 0),
      total_amount: Number(period.totalAmount || 0),
      status: period.status,
      calculated_by: period.calculator?.name || null,
      calculated_at: period.calculatedAt,
      created_at: period.createdAt,
      updated_at: period.updatedAt,
    },
  };
});
