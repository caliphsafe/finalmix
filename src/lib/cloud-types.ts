export type AssetKind = 'source' | 'reference' | 'stem' | 'mix' | 'master' | 'preview' | 'report';
export type AssetState = 'pending' | 'ready' | 'failed' | 'deleted';
export type JobState = 'queued' | 'analyzing' | 'separating' | 'mixing' | 'reference_matching' | 'mastering' | 'evaluating' | 'rendering' | 'completed' | 'failed' | 'cancel_requested' | 'canceled';

export interface AssetManifest {
  id: string;
  projectId: string;
  ownerId: 'owner';
  kind: AssetKind;
  state: AssetState;
  filename: string;
  contentType: string;
  bytes: number;
  objectKey: string;
  createdAt: string;
  verifiedAt?: string;
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
}

export interface ProjectManifest {
  id: string;
  ownerId: 'owner';
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobManifest {
  id: string;
  projectId: string;
  ownerId: 'owner';
  inputAssetId: string;
  referenceAssetIds: string[];
  idempotencyKey: string;
  state: JobState;
  stage: string;
  progress: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  attempt: number;
  maxAttempts: number;
  workerCallId?: string;
  outputAssets?: Partial<Record<'mix' | 'master' | 'vocals' | 'drums' | 'bass' | 'other' | 'report', string>>;
  error?: { code: string; message: string };
  metrics?: Record<string, number | string | null>;
}

export const assetManifestKey = (id: string) => `metadata/assets/${id}.json`;
export const projectManifestKey = (id: string) => `metadata/projects/${id}.json`;
export const jobManifestKey = (id: string) => `metadata/jobs/${id}.json`;
