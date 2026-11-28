import { NextResponse } from 'next/server';
import { infrastructure } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    product: 'FINAL MIX V3',
    mode: 'cloud-only',
    services: {
      privateAccess: infrastructure.access,
      privateStorage: infrastructure.r2,
      audioWorker: infrastructure.modal,
      processingEnabled: infrastructure.processingEnabled,
    },
    activeProcessing: infrastructure.r2 && infrastructure.modal && infrastructure.processingEnabled,
  });
}
