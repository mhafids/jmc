import { eq, desc } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireTransportAccess(event, 'TRANSPORT_SETTINGS', 'update');

  const body = await readBody(event);
  const baseFare = Number(body.baseFare !== undefined ? body.baseFare : body.base_fare);
  const effectiveStart = body.effectiveStart || body.effective_start;
  const minKm = Number(body.minKm !== undefined ? body.minKm : body.min_km !== undefined ? body.min_km : 5.0);
  const maxKm = body.maxKm !== undefined && body.maxKm !== null && body.maxKm !== ''
    ? Number(body.maxKm)
    : body.max_km !== undefined && body.max_km !== null && body.max_km !== ''
    ? Number(body.max_km)
    : null;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

  if (isNaN(baseFare) || baseFare < 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Tarif (base_fare) harus berupa angka valid >= 0.',
    });
  }

  if (!effectiveStart || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveStart)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Format tanggal berlaku (effective_start) harus YYYY-MM-DD.',
    });
  }

  if (isNaN(minKm) || minKm < 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity: Batas minimum kilometer harus berupa angka >= 0.',
    });
  }

  if (maxKm !== null && (isNaN(maxKm) || maxKm < minKm)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Unprocessable Entity: Batas maksimum kilometer harus lebih besar dari atau sama dengan minimum (${minKm} km).`,
    });
  }

  const currentActive = await db.query.transportAllowanceSettings?.findFirst?.({
    where: (tbl) => eq(tbl.isActive, true),
    orderBy: (tbl, { desc }) => [desc(tbl.effectiveStart), desc(tbl.createdAt)],
  });

  const oldValues = currentActive
    ? {
        id: currentActive.id,
        baseFare: currentActive.baseFare,
        effectiveStart: currentActive.effectiveStart,
        minKm: currentActive.minKm,
        maxKm: currentActive.maxKm,
      }
    : null;

  let settingId;
  const now = new Date();

  if (currentActive) {
    settingId = currentActive.id;
    await db
      .update(schema.transportAllowanceSettings)
      .set({
        baseFare: String(baseFare),
        effectiveStart: effectiveStart,
        minKm: String(minKm),
        maxKm: maxKm !== null ? String(maxKm) : null,
        isActive: isActive,
        updatedAt: now,
      })
      .where(eq(schema.transportAllowanceSettings.id, currentActive.id));
  } else {
    settingId = uuidv7();
    await db.insert(schema.transportAllowanceSettings).values({
      id: settingId,
      baseFare: String(baseFare),
      effectiveStart: effectiveStart,
      minKm: String(minKm),
      maxKm: maxKm !== null ? String(maxKm) : null,
      isActive: isActive,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  const newValues = {
    id: settingId,
    baseFare,
    effectiveStart,
    minKm,
    maxKm,
    isActive,
  };

  const formattedFare = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(baseFare);

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'TRANSPORT_SETTINGS',
    action: 'update',
    description: `Mengubah pengaturan tarif dasar tunjangan transport menjadi ${formattedFare} per km (Min: ${minKm} km, Max: ${maxKm ?? '-'} km).`,
    subjectId: settingId,
    oldValues: oldValues,
    newValues: newValues,
  });

  return {
    status: 'success',
    message: 'Pengaturan tarif dasar tunjangan transport berhasil disimpan.',
    data: newValues,
  };
});
