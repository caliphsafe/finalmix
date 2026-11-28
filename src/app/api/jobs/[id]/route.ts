import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { cancelJob } from '@/lib/modal';
import { getJson, putJson } from '@/lib/r2';
import { JobManifest, jobManifestKey } from '@/lib/cloud-types';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { ownerId } = await requireOwner();
    const { id } = await context.params;
    const job = await getJson<JobManifest>(jobManifestKey(id));
    if (!job || job.ownerId !== ownerId) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { ownerId } = await requireOwner();
    const { id } = await context.params;
    const job = await getJson<JobManifest>(jobManifestKey(id));
    if (!job || job.ownerId !== ownerId) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (['completed', 'failed', 'canceled'].includes(job.state)) return NextResponse.json({ job });
    job.state = 'cancel_requested';
    job.stage = 'Cancellation requested';
    job.updatedAt = new Date().toISOString();
    await putJson(jobManifestKey(job.id), job);
    await cancelJob({ jobId: job.id, workerCallId: job.workerCallId });
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
