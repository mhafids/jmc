import { eq, desc } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireTransportAccess(event, 'TRANSPORT_SETTINGS', 'read');

  const activeSetting = await db.query.transportAllowanceSettings?.findFirst?.({
    where: (tbl) => eq(tbl.isActive, true),
    orderBy: (tbl, { desc }) => [desc(tbl.effectiveStart), desc(tbl.createdAt)],
  });

  if (!activeSetting) {
    return {
      status: 'success',
      data: {
        id: null,
        base_fare: 5000,
        effective_start: new Date().toISOString().split('T')[0],
        min_km: 5.0,
        max_km: 25.0,
        is_active: true,
      },
    };
  }

  return {
    status: 'success',
    data: {
      id: activeSetting.id,
      base_fare: Number(activeSetting.baseFare || 0),
      effective_start: activeSetting.effectiveStart,
      min_km: Number(activeSetting.minKm || 0),
      max_km: activeSetting.maxKm !== null ? Number(activeSetting.maxKm) : null,
      is_active: Boolean(activeSetting.isActive),
      created_at: activeSetting.createdAt,
      updated_at: activeSetting.updatedAt,
    },
  };
});
