import { z } from 'zod';

export const audioContentTypes = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac',
  'audio/x-flac', 'audio/aiff', 'audio/x-aiff', 'audio/mp4', 'audio/ogg',
] as const;

export const signUploadSchema = z.object({
  projectId: z.string().uuid(),
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(audioContentTypes),
  bytes: z.number().int().positive(),
  kind: z.enum(['source', 'reference', 'stem']).default('source'),
});

export const completeUploadSchema = z.object({ assetId: z.string().uuid() });

export const createJobSchema = z.object({
  projectId: z.string().uuid(),
  inputAssetId: z.string().uuid(),
  referenceAssetIds: z.array(z.string().uuid()).max(3).default([]),
  idempotencyKey: z.string().uuid(),
  mode: z.enum(['auto', 'genre', 'reference', 'director', 'pro']).default('auto'),
  genre: z.string().trim().max(40).nullable().default(null),
  strategy: z.enum(['stereo', 'hybrid', 'stems']).default('hybrid'),
  style: z.enum(['balanced', 'clean', 'warm', 'analog', 'punchy', 'dynamic', 'loud', 'wide', 'aggressive', 'streaming', 'radio', 'club', 'reference_matched']).default('balanced'),
  targetLufs: z.number().min(-24).max(-8).nullable().default(null),
  truePeakCeiling: z.number().min(-6).max(-0.3).default(-1),
  outputBitDepth: z.enum(['16', '24', '32']).default('24'),
  outputSampleRate: z.enum(['source', '44100', '48000', '96000']).default('source'),
});
