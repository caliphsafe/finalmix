import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { env } from '@/lib/env';
import { getJson, privateObjectKey, putJson, signUpload } from '@/lib/r2';
import { AssetManifest, ProjectManifest, assetManifestKey, projectManifestKey } from '@/lib/cloud-types';
import { signUploadSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { ownerId } = await requireOwner();
    const input = signUploadSchema.parse(await request.json());
    if (input.bytes > env.FINALMIX_MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File exceeds the ${Math.floor(env.FINALMIX_MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit` }, { status: 413 });
    }
    const project = await getJson<ProjectManifest>(projectManifestKey(input.projectId));
    if (!project || project.ownerId !== ownerId) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const id = randomUUID();
    const extension = input.filename.split('.').pop() ?? 'audio';
    const objectKey = privateObjectKey(ownerId, id, extension);
    const asset: AssetManifest = {
      id, projectId: input.projectId, ownerId, kind: input.kind, state: 'pending',
      filename: input.filename, contentType: input.contentType, bytes: input.bytes,
      objectKey, createdAt: new Date().toISOString(),
    };
    await putJson(assetManifestKey(id), asset);
    const uploadUrl = await signUpload(objectKey, input.contentType, input.bytes);
    return NextResponse.json({ assetId: id, uploadUrl, expiresIn: env.R2_SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    return error instanceof z.ZodError
      ? NextResponse.json({ error: 'Unsupported or invalid audio upload' }, { status: 422 })
      : apiError(error);
  }
}
