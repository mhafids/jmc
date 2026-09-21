import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';

export async function createJwtToken(payload, secretKey, expiresIn = '24h') {
  const secret = new TextEncoder().encode(secretKey);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJwtToken(token, secretKey) {
  try {
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 3) {
    return `${user.slice(0, 1)}***@${domain}`;
  }
  const visible = user.slice(0, 3);
  return `${visible}******@${domain}`;
}

export function generateNumericOtp(digits = 4) {
  let otp = '';
  for (let i = 0; i < digits; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}
