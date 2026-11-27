import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyWorkerSignature } from '@/lib/modal';
import { getJson, putJson } from '@/lib/r2';
import { JobManifest, JobState, jobManifestKey } from '@/lib/cloud-types';

const schema = z.object({
  jobId: z.string().uuid(),
  state: z.enum(['queued', 'analyzing', 'separating', 'mixing', 'reference_matching', 'mastering', 'evaluating', 'rendering', 'completed', 'failed', 'canceled']),
  stage: z.string().min(1).max(160),
  progress: z.number().int().min(0).max(100),
  outputAssets: z.record(z.string(), z.string()).optional(),
  error: z.object({ code: z.string().max(80), message: z.string().max(500) }).optional(),
  metrics: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!verifyWorkerSignature(body, request.headers.get('x-finalmix-timestamp'), request.headers.get('x-finalmix-signature'))) {
    return NextResponse.json({ error: 'Invalid worker signature' }, { status: 401 });
  }
  try {
    const input = schema.parse(JSON.parse(body));
    const job = await getJson<JobManifest>(jobManifestKey(input.jobId));
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.state === 'cancel_requested' && input.state !== 'canceled') return NextResponse.json({ accepted: false, cancel: true }, { status: 409 });
    if (input.progress < job.progress && input.state !== 'failed') return NextResponse.json({ error: 'Progress cannot move backwards' }, { status: 409 });
    const updated: JobManifest = {
      ...job,
      state: input.state as JobState,
      stage: input.stage,
      progress: input.progress,
      updatedAt: new Date().toISOString(),
      outputAssets: input.outputAssets ?? job.outputAssets,
      error: input.error,
      metrics: input.metrics ?? job.metrics,
    };
    await putJson(jobManifestKey(job.id), updated);
    return NextResponse.json({ accepted: true, cancel: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid update' }, { status: 422 });
  }
}
