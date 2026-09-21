import { isNull, eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireEmployeeAccess(event, 'read');

  const query = getQuery(event);
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const departmentId = typeof query.departmentId === 'string' ? query.departmentId.trim() : '';
  const positionId = typeof query.positionId === 'string' ? query.positionId.trim() : '';
  const employmentType = typeof query.employmentType === 'string' ? query.employmentType.trim() : '';
  const minTenure = query.minTenure !== undefined && query.minTenure !== '' ? parseInt(query.minTenure) : null;
  const maxTenure = query.maxTenure !== undefined && query.maxTenure !== '' ? parseInt(query.maxTenure) : null;
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : 'createdAt';
  const sortOrder = String(query.sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

  const conditions = [isNull(schema.employees.deletedAt)];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(schema.employees.nip, searchPattern),
        like(schema.employees.name, searchPattern),
        sql`LOWER(${schema.employees.nip}) LIKE LOWER(${searchPattern})`,
        sql`LOWER(${schema.employees.name}) LIKE LOWER(${searchPattern})`,
        like(schema.positions.name, searchPattern),
        sql`LOWER(${schema.positions.name}) LIKE LOWER(${searchPattern})`
      )
    );
  }

  if (departmentId) {
    conditions.push(eq(schema.employees.departmentId, departmentId));
  }

  if (positionId) {
    conditions.push(eq(schema.employees.positionId, positionId));
  }

  if (employmentType) {
    conditions.push(eq(schema.employees.employmentType, employmentType));
  }

  if (minTenure !== null) {
    conditions.push(
      sql`TIMESTAMPDIFF(YEAR, ${schema.employees.joinedAt}, CURDATE()) >= ${minTenure}`
    );
  }

  if (maxTenure !== null) {
    conditions.push(
      sql`TIMESTAMPDIFF(YEAR, ${schema.employees.joinedAt}, CURDATE()) <= ${maxTenure}`
    );
  }

  const whereClause = and(...conditions);

  let orderColumn = schema.employees.createdAt;
  if (sortBy === 'nip') orderColumn = schema.employees.nip;
  else if (sortBy === 'name') orderColumn = schema.employees.name;
  else if (sortBy === 'position') orderColumn = schema.positions.name;
  else if (sortBy === 'joinedAt' || sortBy === 'tanggalMasuk') orderColumn = schema.employees.joinedAt;
  else if (sortBy === 'tenure' || sortBy === 'masaKerja') orderColumn = schema.employees.joinedAt;

  const isTenureSort = sortBy === 'tenure' || sortBy === 'masaKerja';
  let orderExpr;
  if (isTenureSort) {
    orderExpr = sortOrder === 'asc' ? desc(schema.employees.joinedAt) : asc(schema.employees.joinedAt);
  } else {
    orderExpr = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
  }

  const countResult = await db
    .select({ total: sql`cast(count(${schema.employees.id}) as unsigned)` })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .where(whereClause);

  const total = Number(countResult[0]?.total || 0);

  const employeeList = await db
    .select({
      id: schema.employees.id,
      nip: schema.employees.nip,
      name: schema.employees.name,
      email: schema.employees.email,
      phone: schema.employees.phone,
      photoPath: schema.employees.photoPath,
      joinedAt: schema.employees.joinedAt,
      employmentType: schema.employees.employmentType,
      status: schema.employees.status,
      positionId: schema.employees.positionId,
      positionName: schema.positions.name,
      departmentId: schema.employees.departmentId,
      departmentName: schema.departments.name,
      yearsOfService: sql`TIMESTAMPDIFF(YEAR, ${schema.employees.joinedAt}, CURDATE())`,
      monthsOfService: sql`TIMESTAMPDIFF(MONTH, ${schema.employees.joinedAt}, CURDATE()) % 12`,
    })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    success: true,
    data: employeeList,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
});
