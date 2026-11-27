import assert from 'node:assert/strict';
import test from 'node:test';
import { createJobSchema, signUploadSchema } from '../../src/lib/validation';

test('cloud upload contract rejects executable and oversized-shape inputs', () => {
  assert.equal(signUploadSchema.safeParse({ projectId: crypto.randomUUID(), filename: 'song.exe', contentType: 'application/octet-stream', bytes: 12, kind: 'source' }).success, false);
  assert.equal(signUploadSchema.safeParse({ projectId: 'not-a-uuid', filename: 'song.wav', contentType: 'audio/wav', bytes: 12, kind: 'source' }).success, false);
});

test('engineering job contract bounds output and peak settings', () => {
  const base = { projectId: crypto.randomUUID(), inputAssetId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() };
  assert.equal(createJobSchema.safeParse(base).success, true);
  assert.equal(createJobSchema.safeParse({ ...base, truePeakCeiling: 0 }).success, false);
  assert.equal(createJobSchema.safeParse({ ...base, outputSampleRate: '192000' }).success, false);
  assert.equal(createJobSchema.safeParse({ ...base, referenceAssetIds: Array.from({ length: 4 }, () => crypto.randomUUID()) }).success, false);
});

test('job idempotency keys must be UUIDs', () => {
  const result = createJobSchema.safeParse({ projectId: crypto.randomUUID(), inputAssetId: crypto.randomUUID(), idempotencyKey: 'repeat-me' });
  assert.equal(result.success, false);
});
