import crypto from 'node:crypto';

export function generateSvgCaptcha({ length = 5, width = 160, height = 48 } = {}) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const lines = [];
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const stroke = ['#0d6efd', '#206bc4', '#6c757d', '#adb5bd'][i % 4];
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.2" opacity="0.6" />`);
  }

  const charSpacing = width / (length + 1);
  const charElements = text
    .split('')
    .map((char, index) => {
      const x = Math.floor((index + 0.6) * charSpacing);
      const y = Math.floor(height * 0.7 + (Math.random() * 6 - 3));
      const rot = Math.floor(Math.random() * 26 - 13);
      const colors = ['#206bc4', '#1d273b', '#0054a6', '#d63939', '#4263eb'];
      const color = colors[index % colors.length];
      return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-weight="bold" font-size="24" fill="${color}" transform="rotate(${rot}, ${x}, ${y})">${char}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f8fafc; border-radius: 6px; user-select: none;">
    <rect width="100%" height="100%" fill="#f1f5f9" rx="4" />
    ${lines.join('')}
    ${charElements}
  </svg>`;

  return { text, svg };
}

export function signCaptchaToken(text, secret, ttlSeconds = 300) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${text.toUpperCase()}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${expiresAt}.${hmac}`;
}

export function verifyCaptchaToken(inputCode, token, secret) {
  if (!inputCode || !token) return false;
  const [expiresAtStr, signature] = token.split('.');
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const payload = `${inputCode.trim().toUpperCase()}:${expiresAt}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (signature.length !== expectedHmac.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac));
}
