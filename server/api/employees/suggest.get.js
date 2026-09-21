import { like, or, and, isNull, eq, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireSuperadmin } from '~~/server/utils/user-auth-guard.js';
import { checkRateLimit } from '~~/server/utils/rate-limiter.js';

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event);

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  checkRateLimit(`suggest:${clientIp}`, 60, 60000);

  const query = getQuery(event);
  const keyword = typeof query.q === 'string' ? query.q.trim() : '';

  if (!keyword || keyword.length < 2) {
    return {
      success: true,
      data: [],
    };
  }

  const searchPattern = `%${keyword}%`;

  const results = await db
    .select({
      id: schema.employees.id,
      nip: schema.employees.nip,
      name: schema.employees.name,
      email: schema.employees.email,
      phone: schema.employees.phone,
      positionId: schema.employees.positionId,
      positionName: schema.positions.name,
      departmentId: schema.employees.departmentId,
      departmentName: schema.departments.name,
      status: schema.employees.status,
    })
    .from(schema.employees)
    .leftJoin(schema.positions, eq(schema.employees.positionId, schema.positions.id))
    .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.id))
    .where(
      and(
        isNull(schema.employees.deletedAt),
        eq(schema.employees.status, 'active'),
        or(
          like(schema.employees.name, searchPattern),
          like(schema.employees.nip, searchPattern),
          sql`LOWER(${schema.employees.name}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${schema.employees.nip}) LIKE LOWER(${searchPattern})`
        )
      )
    )
    .limit(15);

  return {
    success: true,
    data: results,
  };
});
