import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireTransportAccess } from '~~/server/utils/transport-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireTransportAccess(event, 'TRANSPORT_ALLOWANCES', 'update');

  const periodId = getRouterParam(event, 'id');
  if (!periodId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Parameter ID periode wajib disertakan.',
    });
  }

  const body = await readBody(event);
  const newStatus = body.status;

  if (!newStatus || !['draft', 'calculated', 'locked'].includes(newStatus)) {
    throw createError({
      statusCode: 422,
      statusMessage: "Unprocessable Entity: Status harus salah satu dari 'draft', 'calculated', atau 'locked'.",
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

  const oldStatus = period.status;
  await db
    .update(schema.transportAllowancePeriods)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.transportAllowancePeriods.id, periodId));

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'TRANSPORT_ALLOWANCES',
    action: 'update',
    description: `Mengubah status periode tunjangan transport ${period.periodMonth}/${period.periodYear} dari '${oldStatus}' menjadi '${newStatus}'.`,
    subjectId: periodId,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus },
  });

  return {
    status: 'success',
    message: `Status periode berhasil diubah menjadi '${newStatus}'.`,
    data: {
      id: periodId,
      status: newStatus,
    },
  };
});
