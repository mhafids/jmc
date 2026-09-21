import { eq, and, or, like, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireSuperadmin } from '~~/server/utils/user-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event);

  const query = getQuery(event);
  const page = Math.max(1, parseInt(query.page) || 1);
  const perPage = Math.max(1, Math.min(100, parseInt(query.perPage || query.limit) || 10));
  const offset = (page - 1) * perPage;

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const moduleCode = typeof query.moduleCode === 'string' ? query.moduleCode.trim() : '';
  const action = typeof query.action === 'string' ? query.action.trim() : '';
  const startDate = typeof query.startDate === 'string' ? query.startDate.trim() : '';
  const endDate = typeof query.endDate === 'string' ? query.endDate.trim() : '';

  const conditions = [];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(schema.activityLogs.description, searchPattern),
        like(schema.activityLogs.moduleCode, searchPattern),
        like(schema.activityLogs.action, searchPattern),
        like(schema.activityLogs.ipAddress, searchPattern),
        like(schema.users.name, searchPattern),
        like(schema.users.username, searchPattern)
      )
    );
  }

  if (moduleCode) {
    conditions.push(eq(schema.activityLogs.moduleCode, moduleCode));
  }

  if (action) {
    conditions.push(eq(schema.activityLogs.action, action));
  }

  if (startDate) {
    const startObj = new Date(`${startDate}T00:00:00.000Z`);
    if (!isNaN(startObj.getTime())) {
      conditions.push(gte(schema.activityLogs.createdAt, startObj));
    }
  }

  if (endDate) {
    const endObj = new Date(`${endDate}T23:59:59.999Z`);
    if (!isNaN(endObj.getTime())) {
      conditions.push(lte(schema.activityLogs.createdAt, endObj));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: sql`cast(count(${schema.activityLogs.id}) as unsigned)` })
    .from(schema.activityLogs)
    .leftJoin(schema.users, eq(schema.activityLogs.userId, schema.users.id))
    .where(whereClause);

  const total = Number(countResult[0]?.total || 0);
  const totalPages = Math.ceil(total / perPage);

  const logs = await db
    .select({
      id: schema.activityLogs.id,
      userId: schema.activityLogs.userId,
      userName: schema.users.name,
      username: schema.users.username,
      userRole: schema.roles.name,
      moduleCode: schema.activityLogs.moduleCode,
      action: schema.activityLogs.action,
      description: schema.activityLogs.description,
      subjectId: schema.activityLogs.subjectId,
      ipAddress: schema.activityLogs.ipAddress,
      userAgent: schema.activityLogs.userAgent,
      oldValues: schema.activityLogs.oldValues,
      newValues: schema.activityLogs.newValues,
      url: schema.activityLogs.url,
      method: schema.activityLogs.method,
      createdAt: schema.activityLogs.createdAt,
    })
    .from(schema.activityLogs)
    .leftJoin(schema.users, eq(schema.activityLogs.userId, schema.users.id))
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(whereClause)
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(perPage)
    .offset(offset);

  const formattedLogs = logs.map((item) => ({
    id: item.id,
    userId: item.userId,
    userName: item.userName || 'Sistem / Anonim',
    username: item.username || 'system',
    userRole: item.userRole || 'System',
    moduleCode: item.moduleCode,
    action: item.action,
    description: item.description,
    subjectId: item.subjectId,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    oldValues: item.oldValues,
    newValues: item.newValues,
    url: item.url,
    method: item.method,
    createdAt: item.createdAt,
  }));

  return {
    success: true,
    data: formattedLogs,
    meta: {
      currentPage: page,
      perPage: perPage,
      totalItems: total,
      totalPages: totalPages || 1,
    },
  };
});
