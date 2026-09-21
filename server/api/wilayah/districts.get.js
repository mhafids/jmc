import { eq, like, sql } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { checkRateLimit } from '~~/server/utils/rate-limiter.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token') || getRequestHeader(event, 'authorization')?.replace('Bearer ', '');

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthenticated: Token sesi tidak ditemukan.',
    });
  }

  const payload = await verifyJwtToken(token, config.authSecret);
  if (!payload || !payload.userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Sesi tidak valid atau telah kedaluwarsa.',
    });
  }

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';
  checkRateLimit(`districts:${clientIp}`, 60, 60000);

  const query = getQuery(event);
  const keyword = typeof query.q === 'string' ? query.q.trim() : '';

  if (!keyword || keyword.length < 3) {
    return {
      success: true,
      data: [],
    };
  }

  const searchPattern = `%${keyword}%`;

  const results = await db
    .select({
      districtId: schema.districts.id,
      districtName: schema.districts.name,
      regencyId: schema.regencies.id,
      regencyName: schema.regencies.name,
      provinceId: schema.provinces.id,
      provinceName: schema.provinces.name,
    })
    .from(schema.districts)
    .innerJoin(schema.regencies, eq(schema.districts.regencyId, schema.regencies.id))
    .innerJoin(schema.provinces, eq(schema.regencies.provinceId, schema.provinces.id))
    .where(
      sql`LOWER(${schema.districts.name}) LIKE LOWER(${searchPattern})`
    )
    .limit(20);

  return {
    success: true,
    data: results,
  };
});
