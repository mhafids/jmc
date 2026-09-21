import { isNull, eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireSuperadmin } from '~~/server/utils/user-auth-guard.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireSuperadmin(event);

  const query = getQuery(event);
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const roleId = typeof query.roleId === 'string' ? query.roleId.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim() : '';
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : 'createdAt';
  const sortOrder = String(query.sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

  const conditions = [isNull(schema.users.deletedAt)];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(schema.users.name, searchPattern),
        like(schema.users.username, searchPattern),
        like(schema.users.email, searchPattern)
      )
    );
  }

  if (roleId) {
    conditions.push(eq(schema.users.roleId, roleId));
  }

  if (status) {
    conditions.push(eq(schema.users.status, status));
  }

  const whereClause = and(...conditions);

  let orderColumn = schema.users.createdAt;
  if (sortBy === 'name') orderColumn = schema.users.name;
  else if (sortBy === 'username') orderColumn = schema.users.username;
  else if (sortBy === 'status') orderColumn = schema.users.status;

  const orderExpr = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

  const countResult = await db
    .select({ total: sql`cast(count(${schema.users.id}) as unsigned)` })
    .from(schema.users)
    .where(whereClause);

  const total = Number(countResult[0]?.total || 0);

  const usersList = await db
    .select({
      id: schema.users.id,
      employeeId: schema.users.employeeId,
      employeeNip: schema.employees.nip,
      roleId: schema.users.roleId,
      roleName: schema.roles.name,
      name: schema.users.name,
      nama: schema.users.name,
      username: schema.users.username,
      email: schema.users.email,
      cellphone: schema.users.cellphone,
      status: schema.users.status,
      isActive: schema.users.isActive,
      jobTitle: sql`COALESCE(${schema.users.jobTitle}, ${schema.positions.name}, '-')`,
      jabatan: sql`COALESCE(${schema.users.jobTitle}, ${schema.positions.name}, '-')`,
      department: sql`COALESCE(${schema.users.department}, ${schema.departments.name}, '-')`,
      departemen: sql`COALESCE(${schema.users.department}, ${schema.departments.name}, '-')`,
      role: schema.roles.name,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
    })
    .from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .leftJoin(schema.employees, eq(schema.users.employeeId, schema.employees.id))
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    success: true,
    data: usersList,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    currentUserId: currentUser.id,
  };
});
