import { eq, and, isNull, or, like, sql, asc } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireAttendanceAccess(event, 'read');

  const query = getQuery(event);

  const now = new Date();
  const defaultPrevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYear = defaultPrevDate.getFullYear();
  const defaultMonth = defaultPrevDate.getMonth() + 1;

  const year = parseInt(query.year, 10) || defaultYear;
  const month = parseInt(query.month, 10) || defaultMonth;
  const isDefaultNMinus1 = year === defaultYear && month === defaultMonth;

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = [
    isNull(schema.employees.deletedAt),
    eq(schema.employees.status, 'active'),
  ];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(schema.employees.name, searchPattern),
        like(schema.employees.nip, searchPattern),
        like(schema.positions.name, searchPattern)
      )
    );
  }

  const countResult = await db
    .select({ count: sql`count(distinct ${schema.employees.id})` })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .where(and(...conditions));

  const totalItems = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const rows = await db
    .select({
      employeeId: schema.employees.id,
      nip: schema.employees.nip,
      name: schema.employees.name,
      positionName: schema.positions.name,
      departmentName: schema.departments.name,
      hadir: schema.attendanceSummaries.hadir,
      cuti: schema.attendanceSummaries.cuti,
      izin: schema.attendanceSummaries.izin,
      sakit: schema.attendanceSummaries.sakit,
      unpaidLeave: schema.attendanceSummaries.unpaidLeave,
      statusHadir: schema.attendanceSummaries.statusHadir,
    })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .leftJoin(
      schema.attendanceSummaries,
      and(
        eq(schema.attendanceSummaries.employeeId, schema.employees.id),
        eq(schema.attendanceSummaries.periodYear, year),
        eq(schema.attendanceSummaries.periodMonth, month)
      )
    )
    .where(and(...conditions))
    .orderBy(asc(schema.employees.nip))
    .limit(limit)
    .offset(offset);

  const formattedData = rows.map((row, idx) => {
    const hadirNum = row.hadir !== null && row.hadir !== undefined ? Number(row.hadir) : 0.0;
    const cutiNum = row.cuti !== null && row.cuti !== undefined ? Number(row.cuti) : 0.0;
    const izinNum = row.izin !== null && row.izin !== undefined ? Number(row.izin) : 0.0;
    const unpaidNum = row.unpaidLeave !== null && row.unpaidLeave !== undefined ? Number(row.unpaidLeave) : 0.0;
    const statusHadir = row.statusHadir || (hadirNum >= 19.0 ? 'Terpenuhi' : 'Tidak terpenuhi');

    return {
      no: offset + idx + 1,
      employee_id: row.employeeId,
      nip: row.nip,
      nama: row.name,
      jabatan: row.positionName || '-',
      departemen: row.departmentName || '-',
      hadir: Number(hadirNum.toFixed(1)),
      status_hadir: statusHadir,
      cuti: Number(cutiNum.toFixed(1)),
      kuota_cuti: 12.0,
      izin: Number(izinNum.toFixed(1)),
      kuota_izin: 3.0,
      unpaid_leave: Number(unpaidNum.toFixed(1)),
      kuota_unpaid_leave: 5.0,
    };
  });

  return {
    status: 'success',
    period: {
      year,
      month,
      is_default_n_minus_1: isDefaultNMinus1,
    },
    data: formattedData,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_items: totalItems,
      limit,
    },
  };
});
