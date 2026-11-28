import { NextResponse } from 'next/server';

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Private studio access required' }, { status: 401 });
  if (message.startsWith('Infrastructure not configured') || message.includes('not configured')) {
    return NextResponse.json({ error: message }, { status: 503 });
  }
  console.error(error);
  return NextResponse.json({ error: 'Request could not be completed' }, { status: 500 });
}
