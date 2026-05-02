import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'pesttrace_super_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type SessionPayload = {
  role: 'super_admin';
  exp: number;
};

function getSecret(): string | null {
  const secret = process.env.SUPER_ADMIN_SESSION_SECRET;
  return secret && secret.trim().length >= 16 ? secret : null;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSuperAdminToken(nowMs = Date.now()): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: SessionPayload = {
    role: 'super_admin',
    exp: nowMs + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

export function verifySuperAdminToken(token: string | undefined, nowMs = Date.now()): boolean {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const [body, providedSignature] = token.split('.');
  if (!body || !providedSignature) return false;

  const expectedSignature = sign(body, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    return payload.role === 'super_admin' && typeof payload.exp === 'number' && payload.exp > nowMs;
  } catch {
    return false;
  }
}

export function getSuperAdminCookieName(): string {
  return COOKIE_NAME;
}

export function buildSetSuperAdminCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000,
  )}${secure}`;
}

export function buildClearSuperAdminCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function isSuperAdminCredential(email: string, password: string): boolean {
  const expectedEmail = process.env.SUPER_ADMIN_EMAIL;
  const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  return email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() && password === expectedPassword;
}

