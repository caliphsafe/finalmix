import 'server-only';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, requireInfrastructure } from '@/lib/env';

let cached: S3Client | undefined;

function client() {
  requireInfrastructure('r2');
  cached ??= new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  return cached;
}

export function privateObjectKey(userId: string, assetId: string, extension: string) {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'audio';
  return `users/${userId}/assets/${assetId}/source.${safeExtension}`;
}

export async function signUpload(key: string, contentType: string, bytes: number) {
  return getSignedUrl(client(), new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: bytes,
    Metadata: { private: 'true' },
  }), { expiresIn: env.R2_SIGNED_URL_TTL_SECONDS });
}

export async function signDownload(key: string, filename?: string) {
  return getSignedUrl(client(), new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ResponseContentDisposition: filename ? `attachment; filename="${filename.replace(/["\\\r\n]/g, '_')}"` : undefined,
  }), { expiresIn: Math.min(env.R2_SIGNED_URL_TTL_SECONDS, 600) });
}

export async function inspectObject(key: string) {
  return client().send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export async function putJson(key: string, value: unknown) {
  await client().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    Body: JSON.stringify(value),
    ContentType: 'application/json',
    CacheControl: 'no-store',
  }));
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const result = await client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
    return JSON.parse(await result.Body!.transformToString()) as T;
  } catch (error) {
    if ((error as { name?: string }).name === 'NoSuchKey') return null;
    throw error;
  }
}

export async function listKeys(prefix: string, limit = 100) {
  const result = await client().send(new ListObjectsV2Command({
    Bucket: env.R2_BUCKET,
    Prefix: prefix,
    MaxKeys: Math.min(limit, 100),
  }));
  return (result.Contents ?? []).map((entry) => ({ key: entry.Key!, bytes: entry.Size ?? 0, updatedAt: entry.LastModified?.toISOString() }));
}
