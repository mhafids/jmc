import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { requireAttendanceAccess } from '~~/server/utils/attendance-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireAttendanceAccess(event, 'read');

  const jobId = getRouterParam(event, 'jobId');

  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: ID job import wajib disertakan.',
    });
  }

  const job = await db.query.attendanceImports?.findFirst?.({
    where: (tbl, { eq: eqOp }) => eqOp(tbl.id, jobId),
  });

  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found: Job import tidak ditemukan.',
    });
  }

  return {
    status: 'success',
    data: {
      id: job.id,
      job_status: job.status,
      filename: job.originalFilename,
      total_rows: job.totalRows,
      processed_rows: job.processedRows,
      period_year: job.periodYear,
      period_month: job.periodMonth,
      error_message: job.errorMessage,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    },
  };
});
