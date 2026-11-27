import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { env, infrastructure } from '@/lib/env';
import { dispatchJob } from '@/lib/modal';
import { getJson, listKeys, putJson } from '@/lib/r2';
import { AssetManifest, JobManifest, ProjectManifest, assetManifestKey, jobManifestKey, projectManifestKey } from '@/lib/cloud-types';
import { createJobSchema } from '@/lib/validation';

const activeStates = new Set(['queued', 'analyzing', 'separating', 'mixing', 'reference_matching', 'mastering', 'evaluating', 'rendering']);

async function allJobs() {
  const keys = await listKeys('metadata/jobs/');
  return (await Promise.all(keys.map(({ key }) => getJson<JobManifest>(key))))
    .filter((job): job is JobManifest => Boolean(job))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function GET() {
  try {
    await requireOwner();
    return NextResponse.json({ jobs: await allJobs() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ownerId } = await requireOwner();
    if (!infrastructure.processingEnabled) return NextResponse.json({ error: 'Cloud processing is administratively suspended' }, { status: 503 });
    const input = createJobSchema.parse(await request.json());
    const [project, source, jobs] = await Promise.all([
      getJson<ProjectManifest>(projectManifestKey(input.projectId)),
      getJson<AssetManifest>(assetManifestKey(input.inputAssetId)),
      allJobs(),
    ]);
    if (!project || project.ownerId !== ownerId) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!source || source.ownerId !== ownerId || source.projectId !== project.id || source.state !== 'ready') {
      return NextResponse.json({ error: 'Verified source audio not found' }, { status: 409 });
    }
    const duplicate = jobs.find((job) => job.idempotencyKey === input.idempotencyKey);
    if (duplicate) return NextResponse.json({ job: duplicate });
    if (jobs.filter((job) => activeStates.has(job.state)).length >= env.FINALMIX_MAX_ACTIVE_JOBS_PER_USER) {
      return NextResponse.json({ error: 'An audio job is already active' }, { status: 429 });
    }
    const dayAgo = Date.now() - 86_400_000;
    if (jobs.filter((job) => new Date(job.createdAt).getTime() >= dayAgo).length >= env.FINALMIX_MAX_DAILY_JOBS_PER_USER) {
      return NextResponse.json({ error: 'Daily processing limit reached' }, { status: 429 });
    }
    const references = await Promise.all(input.referenceAssetIds.map((id) => getJson<AssetManifest>(assetManifestKey(id))));
    if (references.some((asset) => !asset || asset.ownerId !== ownerId || asset.state !== 'ready')) {
      return NextResponse.json({ error: 'A reference asset is unavailable' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const job: JobManifest = {
      id: randomUUID(), projectId: project.id, ownerId, inputAssetId: source.id,
      referenceAssetIds: input.referenceAssetIds, idempotencyKey: input.idempotencyKey,
      state: 'queued', stage: 'Queued for cloud processing', progress: 0,
      settings: input, createdAt: now, updatedAt: now, attempt: 1, maxAttempts: 2,
    };
    await putJson(jobManifestKey(job.id), job);
    try {
      const dispatched = await dispatchJob({
        jobId: job.id,
        sourceObjectKey: source.objectKey,
        referenceObjectKeys: references.map((asset) => asset!.objectKey),
        settings: input,
        limits: { maxSeconds: env.FINALMIX_MAX_SONG_SECONDS, maxGpuSeconds: env.FINALMIX_MAX_MONTHLY_GPU_SECONDS_PER_USER },
      });
      job.workerCallId = typeof dispatched.callId === 'string' ? dispatched.callId : undefined;
      job.updatedAt = new Date().toISOString();
      await putJson(jobManifestKey(job.id), job);
    } catch (error) {
      job.state = 'failed';
      job.stage = 'Cloud dispatch failed';
      job.error = { code: 'DISPATCH_FAILED', message: error instanceof Error ? error.message : 'Worker dispatch failed' };
      job.updatedAt = new Date().toISOString();
      await putJson(jobManifestKey(job.id), job);
      throw error;
    }
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return error instanceof z.ZodError
      ? NextResponse.json({ error: 'Invalid engineering job settings' }, { status: 422 })
      : apiError(error);
  }
}
