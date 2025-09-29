// Type definitions for the render job system

export type JobStatus = 'queued' | 'transcribing' | 'translating' | 'rendering' | 'uploading' | 'done' | 'failed' | 'cancelled';
export type ProcessingPhase = 'queued' | 'transcribing' | 'translating' | 'rendering' | 'uploading' | 'done' | 'failed';
export type EventType = 'job_created' | 'status_changed' | 'job_progress' | 'job_completed' | 'job_failed' | 'job_cancelled' | 'validation_started' | 'validation_completed' | 'validation_failed' | 'processing_started' | 'processing_step' | 'language_detected' | 'translation_sample' | 'render_progress' | 'upload_progress';
export type EventSeverity = 'info' | 'warning' | 'error' | 'success';
export type EventCategory = 'system' | 'user' | 'processing' | 'validation' | 'language' | 'render' | 'upload';

export interface ProgressInfo {
  percentage: number;
  currentPhase: ProcessingPhase;
  phaseProgress: number;
  estimatedTimeRemaining: number;
  message: string;
  stepDetails?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
}

export interface EventMetadata {
  severity: EventSeverity;
  category: EventCategory;
  tags: string[];
  language?: string;
  retryCount?: number;
  processingTime?: number;
}

export interface JobMetadata {
  processingLanguages: string[];
  sourceLanguage: string;
  processingSteps: ProcessingStep[];
  totalEstimatedTime: number;
  actualProcessingTime: number;
  retryCount: number;
  lastError: string | null;
  timeoutHandling?: {
    timeoutAt: Date;
    extensions: number;
    maxExtensions: number;
  };
}

export interface ProcessingStep {
  id: string;
  name: string;
  phase: ProcessingPhase;
  estimatedDuration: number;
  actualDuration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface OutputMetadata {
  processedAt: Date;
  duration: number;
  size: string;
  format: string;
  resolution?: {
    width: number;
    height: number;
  };
  quality?: string;
  languages: string[];
  processingStats: {
    totalSegments: number;
    successfulSegments: number;
    failedSegments: number;
    averageConfidence: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: any[];
  warnings: any[];
  processingTime: number;
  metadata: Record<string, any>;
  languageDetection?: LanguageDetectionResult;
}

export interface ProcessingResult {
  renderTime: number;
  uploadTime: number;
  totalTime: number;
  success: boolean;
  error?: string;
}

export interface LanguageResult {
  language: string;
  confidence: number;
  segments: number;
  processingTime: number;
  sample?: string;
}

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
  processingTime: number;
}

export interface RenderJob {
  id: string;
  status: JobStatus;
  phase: ProcessingPhase;
  progress: ProgressInfo;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  input: RenderInput;
  output?: RenderOutput;
  error?: string;
  events: JobEvent[];
  metadata: JobMetadata;
  retries: number;
  timeoutAt?: Date;
}

export interface RenderInput {
  templateId?: string;
  data: Record<string, any>;
  format?: 'pdf' | 'html' | 'image' | 'video';
  options?: Record<string, any>;
  targetLanguage?: string;
  sourceLanguage?: string;
  validation?: {
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    resolution?: {
      width: number;
      height: number;
    };
  };
  processing?: {
    maxRetries?: number;
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
  };
  downloadConfig?: {
    enabled?: boolean;
    url?: string;
    filename?: string;
    maxRetries?: number;
    timeout?: number;
    validateContentType?: boolean;
  };
}

export interface RenderOutput {
  url?: string;
  fileUrl?: string;
  downloadUrl?: string;
  previewUrl?: string;
  metadata?: OutputMetadata;
  validation?: ValidationResult;
  processing?: ProcessingResult;
  languages?: LanguageResult[];
}

export interface JobEvent {
  eventId: string;
  timestamp: Date;
  type: EventType;
  status: JobStatus;
  phase: ProcessingPhase;
  details: Record<string, any>;
  metadata: EventMetadata;
  language?: string;
  sessionId?: string;
}

export interface EventQueryOptions {
  limit?: number;
  offset?: number;
  type?: EventType;
  since?: Date;
  until?: Date;
  severity?: EventSeverity;
  language?: string;
  phase?: ProcessingPhase;
  category?: EventCategory;
  tags?: string[];
}

export interface EventResult {
  events: JobEvent[];
  total: number;
  hasMore: boolean;
  filters: EventQueryOptions;
}