import { eq } from 'drizzle-orm';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';
import { verifyJwtToken } from '~~/server/utils/auth.js';
import { recordActivityLog } from '~~/server/utils/audit.js';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token') || getRequestHeader(event, 'authorization')?.replace('Bearer ', '');

  if (token) {
    const payload = await verifyJwtToken(token, config.authSecret);
    if (payload?.sessionId) {
      await db
        .update(schema.userSessions)
        .set({
          loggedOutAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.userSessions.id, payload.sessionId));

      await recordActivityLog(event, {
        userId: payload.userId,
        moduleCode: 'AUTH',
        action: 'logout',
        description: 'Pengguna melakukan logout manual dari sistem.',
        subjectId: payload.sessionId,
      });
    }
  }

  deleteCookie(event, 'auth_token', {
    path: '/',
  });

  return {
    success: true,
    message: 'Logout berhasil.',
  };
});
