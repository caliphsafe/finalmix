import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { getJson, inspectObject, putJson } from '@/lib/r2';
import { AssetManifest, assetManifestKey } from '@/lib/cloud-types';
import { completeUploadSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { ownerId } = await requireOwner();
    const { assetId } = completeUploadSchema.parse(await request.json());
    const asset = await getJson<AssetManifest>(assetManifestKey(assetId));
    if (!asset || asset.ownerId !== ownerId) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    if (asset.state === 'ready') return NextResponse.json({ asset });
    const object = await inspectObject(asset.objectKey);
    if (object.ContentLength !== asset.bytes || object.ContentType !== asset.contentType) {
      return NextResponse.json({ error: 'Stored file does not match the authorized upload' }, { status: 409 });
    }
    const updated: AssetManifest = { ...asset, state: 'ready', verifiedAt: new Date().toISOString() };
    await putJson(assetManifestKey(assetId), updated);
    return NextResponse.json({ asset: updated });
  } catch (error) {
    return error instanceof z.ZodError
      ? NextResponse.json({ error: 'Invalid asset confirmation' }, { status: 422 })
      : apiError(error);
  }
}
