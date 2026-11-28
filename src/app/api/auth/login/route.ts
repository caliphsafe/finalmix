import { NextRequest, NextResponse } from 'next/server';
import { createOwnerSession, verifyAccessKey } from '@/lib/auth';
import { apiError } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { accessKey?: unknown };
    if (typeof body.accessKey !== 'string' || body.accessKey.length > 256 || !verifyAccessKey(body.accessKey)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return NextResponse.json({ error: 'Access key not accepted' }, { status: 401 });
    }
    await createOwnerSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
