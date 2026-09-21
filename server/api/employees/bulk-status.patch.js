import { inArray, and, isNull } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const { currentUser } = await requireEmployeeAccess(event, 'update');

  const body = await readBody(event);
  const { ids, status } = body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Daftar ID pegawai (ids) tidak boleh kosong.',
    });
  }

  const cleanStatus = status === 'inactive' ? 'inactive' : 'active';

  await db
    .update(schema.employees)
    .set({
      status: cleanStatus,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(and(inArray(schema.employees.id, ids), isNull(schema.employees.deletedAt)));

  await recordActivityLog(event, {
    userId: currentUser.id,
    moduleCode: 'EMPLOYEES',
    action: 'update',
    description: `Pembaruan status massal menjadi '${cleanStatus}' untuk ${ids.length} pegawai.`,
    newValues: {
      ids,
      status: cleanStatus,
    },
  });

  return {
    success: true,
    message: `Status ${ids.length} pegawai berhasil diperbarui menjadi ${cleanStatus}.`,
  };
});
