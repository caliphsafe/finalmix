export type AudioData = { channels: Float32Array[]; sampleRate: number };
export type Progress = (progress: number, stage: string) => void;
export type Analysis = {
  duration: number; sampleRate: number; channels: number; integratedLufs: number | null;
  samplePeakDb: number | null; truePeakDb: number | null; rmsDb: number | null;
  crestFactor: number | null; correlation: number | null; stereoWidth: number;
  clippingSamples: number; silencePercent: number; loudnessRange: number | null;
  momentary: number[]; shortTerm: number[]; waveform: number[];
  spectrum: {frequency: number; db: number}[]; bands: {name: string; energy: number}[];
  spectralCentroid: number | null; notes: string[];
};
export type ProcessOptions = {
  mode: 'AUTO' | 'REFERENCE' | 'GENRE' | 'DIRECTOR' | 'PRO'; genre: string; style: string;
  targetLufs: number; ceilingDb: number; bassDb: number; warmthDb: number; presenceDb: number;
  airDb: number; width: number; compression: number; referenceIntensity: number;
  autoCorrect: boolean;
};
export type Decision = {processor: string; reason: string; adjustment: string};
export type ProcessResult = {mix: AudioData; master: AudioData; before: Analysis; after: Analysis;
  decisions: Decision[]; options: ProcessOptions; qc: {passed: boolean; warnings: string[]}};
