import { z } from 'zod';

const optionalUrl = z.string().url().optional().or(z.literal(''));

const serverSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  FINALMIX_ACCESS_KEY: z.string().optional().default(''),
  FINALMIX_SESSION_SECRET: z.string().optional().default(''),
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET: z.string().optional().default('finalmix-audio'),
  R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
  MODAL_JOB_ENDPOINT: optionalUrl,
  MODAL_CANCEL_ENDPOINT: optionalUrl,
  MODAL_WEBHOOK_SECRET: z.string().optional().default(''),
  FINALMIX_MAX_UPLOAD_BYTES: z.coerce.number().int().min(1).max(500 * 1024 * 1024).default(150 * 1024 * 1024),
  FINALMIX_MAX_SONG_SECONDS: z.coerce.number().int().min(1).max(3600).default(600),
  FINALMIX_MAX_ACTIVE_JOBS_PER_USER: z.coerce.number().int().min(1).max(10).default(1),
  FINALMIX_MAX_DAILY_JOBS_PER_USER: z.coerce.number().int().min(1).max(100).default(3),
  FINALMIX_MAX_MONTHLY_GPU_SECONDS_PER_USER: z.coerce.number().int().min(1).default(3600),
  FINALMIX_GLOBAL_PROCESSING_ENABLED: z.enum(['true', 'false']).default('false'),
});

export const env = serverSchema.parse(process.env);

export const infrastructure = {
  access: Boolean(env.FINALMIX_ACCESS_KEY && env.FINALMIX_SESSION_SECRET.length >= 32),
  r2: Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET),
  modal: Boolean(env.MODAL_JOB_ENDPOINT && env.MODAL_WEBHOOK_SECRET),
  processingEnabled: env.FINALMIX_GLOBAL_PROCESSING_ENABLED === 'true',
};

export function requireInfrastructure(...services: Array<keyof typeof infrastructure>) {
  const missing = services.filter((service) => !infrastructure[service]);
  if (missing.length) throw new Error(`Infrastructure not configured: ${missing.join(', ')}`);
}
