import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { getJson, signDownload } from '@/lib/r2';
import { AssetManifest, JobManifest, assetManifestKey, jobManifestKey } from '@/lib/cloud-types';

const kindSchema = z.enum(['original', 'mix', 'master', 'vocals', 'drums', 'bass', 'other', 'report']);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { ownerId } = await requireOwner();
    const { id } = await context.params;
    const kind = kindSchema.parse(request.nextUrl.searchParams.get('kind') ?? 'master');
    const download = request.nextUrl.searchParams.get('download') === '1';
    const job = await getJson<JobManifest>(jobManifestKey(id));
    if (!job || job.ownerId !== ownerId) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    let key: string | undefined;
    let filename = `finalmix-${kind}.${kind === 'report' ? 'json' : 'wav'}`;
    if (kind === 'original') {
      const source = await getJson<AssetManifest>(assetManifestKey(job.inputAssetId));
      key = source?.objectKey;
      filename = source?.filename ?? filename;
    } else {
      key = job.outputAssets?.[kind];
    }
    if (!key || !key.startsWith('users/owner/')) return NextResponse.json({ error: 'Audio is not available' }, { status: 404 });
    return NextResponse.json({ url: await signDownload(key, download ? filename : undefined), expiresIn: 600 });
  } catch (error) {
    return error instanceof z.ZodError
      ? NextResponse.json({ error: 'Unknown audio output' }, { status: 422 })
      : apiError(error);
  }
}
