import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { getJson, listKeys, putJson } from '@/lib/r2';
import { ProjectManifest, projectManifestKey } from '@/lib/cloud-types';

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function GET() {
  try {
    await requireOwner();
    const keys = await listKeys('metadata/projects/');
    const projects = (await Promise.all(keys.map(({ key }) => getJson<ProjectManifest>(key))))
      .filter((project): project is ProjectManifest => Boolean(project))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return NextResponse.json({ projects });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();
    const { name } = createSchema.parse(await request.json());
    const now = new Date().toISOString();
    const project: ProjectManifest = { id: randomUUID(), ownerId: 'owner', name, createdAt: now, updatedAt: now };
    await putJson(projectManifestKey(project.id), project);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return error instanceof z.ZodError
      ? NextResponse.json({ error: 'Invalid project name' }, { status: 422 })
      : apiError(error);
  }
}
