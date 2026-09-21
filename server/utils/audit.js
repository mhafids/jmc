import { uuidv7 } from 'uuidv7';
import { db } from '~~/app/databases/drizzle.js';
import * as schema from '~~/app/databases/schema.js';

export function sanitizeAuditData(data) {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeAuditData(item));
  }

  const sensitiveKeys = [
    'password', 'passwordhash', 'password_hash', 'currentpassword', 'newpassword', 'confirmpassword',
    'token', 'authtoken', 'auth_token', 'refreshtoken', 'refresh_token', 'jwt',
    'otp', 'otpcode', 'otp_code', 'otphash', 'otp_hash',
    'secret', 'authsecret', 'auth_secret', 'captchasecret', 'captchakey'
  ];

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (sensitiveKeys.some(s => lowerKey.includes(s.replace(/[-_]/g, '')))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function recordActivityLog(event, params) {
  try {
    const p = params || {};
    const evt = event || p.event;
    const reqHeaders = evt ? getRequestHeaders(evt) : {};
    const ipAddress = evt ? (getRequestIP(evt, { xForwardedFor: true }) || '127.0.0.1') : '127.0.0.1';
    const userAgent = reqHeaders['user-agent'] || null;
    const url = p.url || (evt ? getRequestURL(evt).pathname : null);
    const method = p.method || (evt ? getMethod(evt) : null);

    const oldValues = p.oldValues ? sanitizeAuditData(p.oldValues) : null;
    const newValues = p.newValues ? sanitizeAuditData(p.newValues) : null;

    await db.insert(schema.activityLogs).values({
      id: uuidv7(),
      userId: p.userId || null,
      moduleCode: p.moduleCode,
      action: p.action,
      description: p.description || null,
      subjectId: p.subjectId || null,
      ipAddress: ipAddress,
      userAgent: userAgent,
      oldValues: oldValues,
      newValues: newValues,
      url: url,
      method: method,
    });
  } catch (error) {
    console.error('Failed to record activity log:', error);
  }
}

export const createActivityLog = async (eventOrParams, maybeParams) => {
  if (maybeParams) {
    return recordActivityLog(eventOrParams, maybeParams);
  }
  return recordActivityLog(eventOrParams?.event, eventOrParams);
};

