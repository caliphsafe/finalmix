import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env, requireInfrastructure } from '@/lib/env';

const COOKIE = 'finalmix_owner_session';
const MAX_AGE = 60 * 60 * 24 * 14;

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(value: string) {
  return createHmac('sha256', env.FINALMIX_SESSION_SECRET).update(value).digest('base64url');
}

export function verifyAccessKey(value: string) {
  requireInfrastructure('access');
  return equal(value, env.FINALMIX_ACCESS_KEY);
}

export async function createOwnerSession() {
  requireInfrastructure('access');
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `owner.${expires}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearOwnerSession() {
  (await cookies()).delete(COOKIE);
}

export async function isOwner() {
  if (!env.FINALMIX_SESSION_SECRET) return false;
  const token = (await cookies()).get(COOKIE)?.value ?? '';
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'owner') return false;
  const value = `${parts[0]}.${parts[1]}`;
  const expires = Number(parts[1]);
  return Number.isFinite(expires) && expires > Date.now() / 1000 && equal(parts[2], sign(value));
}

export async function requireOwner() {
  if (!(await isOwner())) throw new Error('AUTH_REQUIRED');
  return { ownerId: 'owner' as const };
}
