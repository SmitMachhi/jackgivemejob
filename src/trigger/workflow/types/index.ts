export interface RenderWorkflowInput {
  jobId: string;
  r2Key: string;
  targetLang: string;
}

export interface VideoMetadata {
  duration: number;
  hasAudio: boolean;
  width: number;
  height: number;
  format: string;
  size: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
}

export interface ProbeErrorCodes {
  TOO_LONG: "too_long";
  NO_AUDIO: "no_audio";
  UNSUPPORTED: "unsupported";
}

export interface TranscriptionResult {
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
}

export interface CaptionsResult {
  captions: Array<{
    start: number;
    end: number;
    text: string;
    targetLang: string;
  }>;
  format: string;
}

export interface RenderResult {
  outputPath: string;
}

export interface WorkflowResult {
  success: boolean;
  jobId: string;
  finalUrl: string;
  metadata: VideoMetadata;
}