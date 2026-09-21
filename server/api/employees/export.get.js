import { isNull, eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireEmployeeAccess(event, 'read');

  const query = getQuery(event);
  const format = String(query.format || 'csv').toLowerCase();

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const departmentId = typeof query.departmentId === 'string' ? query.departmentId.trim() : '';
  const positionId = typeof query.positionId === 'string' ? query.positionId.trim() : '';
  const employmentType = typeof query.employmentType === 'string' ? query.employmentType.trim() : '';

  const conditions = [isNull(schema.employees.deletedAt)];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(schema.employees.nip, searchPattern),
        like(schema.employees.name, searchPattern),
        sql`LOWER(${schema.employees.nip}) LIKE LOWER(${searchPattern})`,
        sql`LOWER(${schema.employees.name}) LIKE LOWER(${searchPattern})`
      )
    );
  }

  if (departmentId) conditions.push(eq(schema.employees.departmentId, departmentId));
  if (positionId) conditions.push(eq(schema.employees.positionId, positionId));
  if (employmentType) conditions.push(eq(schema.employees.employmentType, employmentType));

  const list = await db
    .select({
      nip: schema.employees.nip,
      name: schema.employees.name,
      email: schema.employees.email,
      phone: schema.employees.phone,
      position: schema.positions.name,
      department: schema.departments.name,
      employmentType: schema.employees.employmentType,
      joinedAt: schema.employees.joinedAt,
      status: schema.employees.status,
    })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .where(and(...conditions))
    .orderBy(asc(schema.employees.nip));

  const headers = ['NIP', 'Nama Pegawai', 'Email', 'No HP', 'Jabatan', 'Departemen', 'Status Kontrak', 'Tanggal Masuk', 'Status'];
  const rows = list.map((item) => [
    `"${item.nip || ''}"`,
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${item.email || ''}"`,
    `"${item.phone || ''}"`,
    `"${item.position || ''}"`,
    `"${item.department || ''}"`,
    `"${item.employmentType || ''}"`,
    `"${item.joinedAt ? new Date(item.joinedAt).toLocaleDateString('id-ID') : ''}"`,
    `"${item.status || ''}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8');
  setHeader(event, 'Content-Disposition', 'attachment; filename="daftar-pegawai.csv"');

  return csvContent;
});
