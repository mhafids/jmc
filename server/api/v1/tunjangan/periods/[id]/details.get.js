import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireTransportAccess(event, 'TRANSPORT_ALLOWANCES', 'read');

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

  const query = getQuery(event);
  const search = query.search ? String(query.search).trim().toLowerCase() : '';
  const sortBy = query.sort_by ? String(query.sort_by).toLowerCase() : 'nama';
  const sortDir = (query.sort_dir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 10), 10)));
  const offset = (page - 1) * limit;

  const details = await db
    .select({
      id: schema.transportAllowanceDetails.id,
      employeeId: schema.transportAllowanceDetails.employeeId,
      nip: schema.employees.nip,
      nama: schema.employees.name,
      employmentType: schema.employees.employmentType,
      originalKm: schema.transportAllowanceDetails.originalKm,
      roundedKm: schema.transportAllowanceDetails.roundedKm,
      attendanceDays: schema.transportAllowanceDetails.attendanceDays,
      baseFare: schema.transportAllowanceDetails.baseFare,
      nominal: schema.transportAllowanceDetails.nominal,
      eligibilityStatus: schema.transportAllowanceDetails.eligibilityStatus,
      calculationNote: schema.transportAllowanceDetails.calculationNote,
      createdAt: schema.transportAllowanceDetails.createdAt,
    })
    .from(schema.transportAllowanceDetails)
    .innerJoin(
      schema.employees,
      eq(schema.transportAllowanceDetails.employeeId, schema.employees.id)
    )
    .where(eq(schema.transportAllowanceDetails.transportAllowancePeriodId, periodId));

  let rows = details.map((d) => ({
    id: d.id,
    employee_id: d.employeeId,
    nip: d.nip,
    nama: d.nama,
    employment_type: d.employmentType,
    original_km: Number(d.originalKm || 0),
    km: Number(d.roundedKm || 0),
    hari: Number(d.attendanceDays || 0),
    base_fare: Number(d.baseFare || 0),
    nominal: Number(d.nominal || 0),
    eligibility_status: d.eligibilityStatus,
    calculation_note: d.calculationNote || '',
  }));

  if (search) {
    rows = rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(search) ||
        (r.nip && r.nip.toLowerCase().includes(search)) ||
        (r.calculation_note && r.calculation_note.toLowerCase().includes(search))
    );
  }

  rows.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'km') {
      comp = a.km - b.km;
    } else if (sortBy === 'hari') {
      comp = a.hari - b.hari;
    } else if (sortBy === 'nominal') {
      comp = a.nominal - b.nominal;
    } else {
      comp = a.nama.localeCompare(b.nama, 'id');
    }
    return sortDir === 'desc' ? -comp : comp;
  });

  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedData = rows.slice(offset, offset + limit);

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
