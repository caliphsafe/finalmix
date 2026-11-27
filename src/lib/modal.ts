import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env, requireInfrastructure } from '@/lib/env';

function signature(body: string, timestamp: string) {
  return createHmac('sha256', env.MODAL_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
}

async function signedRequest(url: string, payload: unknown) {
  requireInfrastructure('modal');
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-finalmix-timestamp': timestamp,
      'x-finalmix-signature': signature(body, timestamp),
    },
    body,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Cloud worker rejected request (${response.status})`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function dispatchJob(payload: Record<string, unknown>) {
  if (!env.MODAL_JOB_ENDPOINT) throw new Error('Modal job endpoint is not configured.');
  return signedRequest(env.MODAL_JOB_ENDPOINT, payload);
}

export async function cancelJob(payload: Record<string, unknown>) {
  if (!env.MODAL_CANCEL_ENDPOINT) return { accepted: false };
  return signedRequest(env.MODAL_CANCEL_ENDPOINT, payload);
}

export function verifyWorkerSignature(body: string, timestamp: string | null, supplied: string | null) {
  if (!timestamp || !supplied || !env.MODAL_WEBHOOK_SECRET) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const expected = Buffer.from(signature(body, timestamp), 'hex');
  const actual = Buffer.from(supplied, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
