const rateLimitMap = new Map();

export function checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(key, record);
  }

  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests: Batas pemanggilan API telah terlampaui. Silakan tunggu beberapa saat.',
    });
  }

  record.timestamps.push(now);
}
