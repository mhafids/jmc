import { eq, and, desc, sql } from 'drizzle-orm';
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

  const query = getQuery(event);
  const yearParam = query.year ? parseInt(String(query.year), 10) : null;
  const searchParam = query.search ? String(query.search).trim().toLowerCase() : '';
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 10), 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (yearParam && !isNaN(yearParam)) {
    conditions.push(eq(schema.transportAllowancePeriods.periodYear, yearParam));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rawPeriods = await db
    .select({
      id: schema.transportAllowancePeriods.id,
      periodYear: schema.transportAllowancePeriods.periodYear,
      periodMonth: schema.transportAllowancePeriods.periodMonth,
      totalRecipients: schema.transportAllowancePeriods.totalRecipients,
      totalAmount: schema.transportAllowancePeriods.totalAmount,
      status: schema.transportAllowancePeriods.status,
      calculatedAt: schema.transportAllowancePeriods.calculatedAt,
      createdAt: schema.transportAllowancePeriods.createdAt,
    })
    .from(schema.transportAllowancePeriods)
    .where(whereClause)
    .orderBy(
      desc(schema.transportAllowancePeriods.periodYear),
      desc(schema.transportAllowancePeriods.periodMonth)
    );

  let filtered = rawPeriods.map((p) => {
    const bulanName = MONTH_NAMES[p.periodMonth] || `Bulan ${p.periodMonth}`;
    return {
      id: p.id,
      period_year: p.periodYear,
      period_month: p.periodMonth,
      bulan: bulanName,
      total_recipients: Number(p.totalRecipients || 0),
      total_amount: Number(p.totalAmount || 0),
      status: p.status,
      calculated_at: p.calculatedAt,
      created_at: p.createdAt,
    };
  });

  if (searchParam) {
    filtered = filtered.filter(
      (item) =>
        item.bulan.toLowerCase().includes(searchParam) ||
        String(item.period_year).includes(searchParam) ||
        item.status.toLowerCase().includes(searchParam)
    );
  }

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedData = filtered.slice(offset, offset + limit);

  return {
    status: 'success',
    data: paginatedData,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_items: totalItems,
      limit,
    },
  };
});
