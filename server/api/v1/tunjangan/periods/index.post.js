import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireTransportAccess(event, 'TRANSPORT_ALLOWANCES', 'create');

  const body = await readBody(event);
  const periodYear = parseInt(String(body.periodYear || body.period_year || new Date().getFullYear()), 10);
  const periodMonth = parseInt(String(body.periodMonth || body.period_month || (new Date().getMonth() + 1)), 10);

  if (isNaN(periodYear) || isNaN(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Periode tahun dan bulan tidak valid (Bulan: 1-12).',
    });
  }

  const existing = await db.query.transportAllowancePeriods?.findFirst?.({
    where: (tbl, { and: andOp, eq: eqCol }) =>
      andOp(eqCol(tbl.periodYear, periodYear), eqCol(tbl.periodMonth, periodMonth)),
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Conflict: Periode ${periodMonth}/${periodYear} sudah terdaftar di sistem.`,
    });
  }

  const periodId = uuidv7();
  await db.insert(schema.transportAllowancePeriods).values({
    id: periodId,
    periodYear,
    periodMonth,
    totalRecipients: 0,
    totalAmount: '0.00',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'TRANSPORT_ALLOWANCES',
    action: 'create',
    description: `Membuat inisialisasi draft periode tunjangan transport ${periodMonth}/${periodYear}.`,
    subjectId: periodId,
    newValues: { periodId, periodYear, periodMonth, status: 'draft' },
  });

  setResponseStatus(event, 201);
  return {
    status: 'success',
    message: 'Periode tunjangan transport berhasil dibuat.',
    data: {
      id: periodId,
      period_year: periodYear,
      period_month: periodMonth,
      status: 'draft',
    },
  };
});
