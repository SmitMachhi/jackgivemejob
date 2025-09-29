// Type definitions for enhanced job tracking
export type JobStatus = 'queued' | 'transcribing' | 'translating' | 'rendering' | 'uploading' | 'done' | 'failed' | 'cancelled';

// Import persistent storage
import { PersistentJobStorage } from './persistent-job-storage';
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

export class RenderService {
  private jobs: Map<string, RenderJob> = new Map(); // Keep for backward compatibility during migration
  private validationResults: Map<string, any> = new Map();
  private eventHistory: Map<string, JobEvent[]> = new Map();
  private activeConnections: Set<string> = new Set();
  private persistentStorage: PersistentJobStorage = new PersistentJobStorage();
  private readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_RETRIES = 3;

  // Status state machine
  private readonly STATUS_FLOW: Record<JobStatus, JobStatus[]> = {
    'queued': ['transcribing', 'failed'],
    'transcribing': ['translating', 'failed'],
    'translating': ['rendering', 'failed'],
    'rendering': ['uploading', 'failed'],
    'uploading': ['done', 'failed'],
    'done': [],
    'failed': [],
    'cancelled': []
  };

  // Phase progress weights
  private readonly PHASE_WEIGHTS: Record<ProcessingPhase, number> = {
    'queued': 0,
    'transcribing': 25,
    'translating': 50,
    'rendering': 75,
    'uploading': 90,
    'done': 100,
    'failed': 0
  };

  // Helper method to create an event
  private createEvent(
    type: EventType,
    status: JobStatus,
    phase: ProcessingPhase,
    details: Record<string, any>,
    metadata?: Partial<EventMetadata>,
    language?: string
  ): JobEvent {
    const event: JobEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      status,
      phase,
      details,
      metadata: {
        severity: 'info',
        category: 'system',
        tags: [],
        ...metadata
      },
      language
    };

    // Add to event history
    if (!this.eventHistory.has(details.jobId)) {
      this.eventHistory.set(details.jobId, []);
    }
    this.eventHistory.get(details.jobId)!.push(event);

    return event;
  }

  // Method to append event to a job
  async addEvent(
    jobId: string,
    type: EventType,
    status: JobStatus,
    phase: ProcessingPhase,
    details: Record<string, any>,
    metadata?: Partial<EventMetadata>,
    language?: string
  ): Promise<JobEvent | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const event = this.createEvent(type, status, phase, details, metadata, language);
    job.events.push(event);
    job.updatedAt = new Date();

    // Update job progress if this is a progress event
    if (type === 'job_progress') {
      this.updateJobProgress(jobId, details.progress, phase, details.message);
    }

    // Update job status if changed
    if (status !== job.status) {
      await this.updateJobStatus(jobId, status, phase, details);
    }

    return event;
  }

  // Helper methods for progress and status management
  private updateJobProgress(jobId: string, progress: number, phase: ProcessingPhase, message: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const now = new Date();
    const elapsed = now.getTime() - job.createdAt.getTime();
    const totalEstimated = job.metadata.totalEstimatedTime;
    const remaining = Math.max(0, totalEstimated - elapsed);

    job.progress = {
      percentage: progress,
      currentPhase: phase,
      phaseProgress: this.calculatePhaseProgress(phase, progress),
      estimatedTimeRemaining: remaining,
      message: message || this.getStatusMessage(job.status, phase, job.input.targetLanguage),
      stepDetails: this.getCurrentStepDetails(job)
    };

    job.updatedAt = now;
  }

  private updateJobStatus(jobId: string, newStatus: JobStatus, newPhase: ProcessingPhase, details: Record<string, any>): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const oldStatus = job.status;
    const oldPhase = job.phase;

    // Validate status transition
    if (!this.isValidStatusTransition(oldStatus, newStatus)) {
      console.warn(`Invalid status transition: ${oldStatus} -> ${newStatus}`);
      return;
    }

    job.status = newStatus;
    job.phase = newPhase;
    job.updatedAt = new Date();

    // Update timestamps
    if (newStatus === 'transcribing' && !job.startedAt) {
      job.startedAt = new Date();
    }
    if (newStatus === 'done' || newStatus === 'failed') {
      job.completedAt = new Date();
      job.metadata.actualProcessingTime = job.updatedAt.getTime() - job.createdAt.getTime();
    }

    // Add status change event
    this.addEvent(
      jobId,
      'status_changed',
      newStatus,
      newPhase,
      {
        jobId,
        previousStatus: oldStatus,
        newStatus,
        previousPhase: oldPhase,
        newPhase,
        changedAt: job.updatedAt.toISOString(),
        ...details
      },
      {
        severity: newStatus === 'failed' ? 'error' : newStatus === 'done' ? 'success' : 'info',
        category: 'processing',
        tags: ['status_change', 'phase_transition']
      }
    ).catch(console.error);
  }

  private calculatePhaseProgress(phase: ProcessingPhase, overallProgress: number): number {
    const phaseWeight = this.PHASE_WEIGHTS[phase];
    const previousPhases = Object.keys(this.PHASE_WEIGHTS).filter(p =>
      this.PHASE_WEIGHTS[p as ProcessingPhase] < phaseWeight
    );

    const previousWeight = previousPhases.reduce((sum, p) => sum + this.PHASE_WEIGHTS[p as ProcessingPhase], 0);
    const phaseRange = 25; // Each phase is roughly 25% of total progress

    return Math.min(100, Math.max(0, ((overallProgress - previousWeight) / phaseRange) * 100));
  }

  private getCurrentStepDetails(job: RenderJob): ProgressInfo['stepDetails'] {
    const currentStep = job.metadata.processingSteps.find(step => step.status === 'running');
    if (!currentStep) return undefined;

    return {
      currentStep: job.metadata.processingSteps.indexOf(currentStep) + 1,
      totalSteps: job.metadata.processingSteps.length,
      stepName: currentStep.name
    };
  }

  private isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
    return this.STATUS_FLOW[from]?.includes(to) || false;
  }

  private calculateProcessingSteps(input: RenderInput): ProcessingStep[] {
    const steps: ProcessingStep[] = [];

    if (input.format === 'video') {
      steps.push({
        id: 'transcribe',
        name: 'Transcription',
        phase: 'transcribing',
        estimatedDuration: 30000,
        status: 'pending'
      });

      if (input.targetLanguage && input.targetLanguage !== input.sourceLanguage) {
        steps.push({
          id: 'translate',
          name: 'Translation',
          phase: 'translating',
          estimatedDuration: 20000,
          status: 'pending'
        });
      }

      steps.push({
        id: 'render',
        name: 'Video Rendering',
        phase: 'rendering',
        estimatedDuration: 60000,
        status: 'pending'
      });

      steps.push({
        id: 'upload',
        name: 'Upload Result',
        phase: 'uploading',
        estimatedDuration: 10000,
        status: 'pending'
      });
    }

    return steps;
  }

  private getStatusMessage(status: JobStatus, phase: ProcessingPhase, language?: string): string {
    const messages = {
      'queued': {
        'en': 'Job queued for processing',
        'es': 'Trabajo en cola para procesamiento',
        'fr': 'Tâche mise en file d\'attente pour traitement',
        'hi': 'कार्य प्रसंस्करण के लिए कतारबद्ध है',
        'vi': 'Công việc đã được đưa vào hàng đợi để xử lý'
      },
      'transcribing': {
        'en': 'Transcribing audio...',
        'es': 'Transcribiendo audio...',
        'fr': 'Transcription audio en cours...',
        'hi': 'ऑडियो ट्रांस्क्रिप्शन हो रहा है...',
        'vi': 'Đang phiên âm audio...'
      },
      'translating': {
        'en': 'Translating content...',
        'es': 'Traduciendo contenido...',
        'fr': 'Traduction du contenu en cours...',
        'hi': 'सामग्री का अनुवाद हो रहा है...',
        'vi': 'Đang dịch nội dung...'
      },
      'rendering': {
        'en': 'Rendering video with subtitles...',
        'es': 'Renderizando video con subtítulos...',
        'fr': 'Rendu vidéo avec sous-titres en cours...',
        'hi': 'सबटाइटल के साथ वीडियो रेंडर हो रहा है...',
        'vi': 'Đang render video với phụ đề...'
      },
      'uploading': {
        'en': 'Uploading final result...',
        'es': 'Subiendo resultado final...',
        'fr': 'Téléchargement du résultat final...',
        'hi': 'अंतिम परिणाम अपलोड हो रहा है...',
        'vi': 'Đang tải lên kết quả cuối cùng...'
      },
      'done': {
        'en': 'Processing completed successfully',
        'es': 'Procesamiento completado con éxito',
        'fr': 'Traitement terminé avec succès',
        'hi': 'प्रसंस्करण सफलतापूर्वक पूर्ण हुआ',
        'vi': 'Xử lý hoàn thành thành công'
      },
      'failed': {
        'en': 'Processing failed',
        'es': 'Procesamiento fallido',
        'fr': 'Traitement échoué',
        'hi': 'प्रसंस्करण विफल',
        'vi': 'Xử lý thất bại'
      }
    };

    return messages[phase]?.[language || 'en'] || messages[phase]?.['en'] || `Processing ${phase}...`;
  }

  // Method to retrieve events for a specific job with enhanced filtering and pagination
  async getJobEvents(jobId: string, options: EventQueryOptions = {}): Promise<EventResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        events: [],
        total: 0,
        hasMore: false,
        filters: options
      };
    }

    // Use event history for better performance
    const allEvents = this.eventHistory.get(jobId) || job.events;
    let filteredEvents = [...allEvents];

    // Apply enhanced filters
    if (options.type) {
      filteredEvents = filteredEvents.filter(event => event.type === options.type);
    }

    if (options.language) {
      filteredEvents = filteredEvents.filter(event => event.language === options.language);
    }

    if (options.phase) {
      filteredEvents = filteredEvents.filter(event => event.phase === options.phase);
    }

    if (options.category) {
      filteredEvents = filteredEvents.filter(event => event.metadata.category === options.category);
    }

    if (options.severity) {
      filteredEvents = filteredEvents.filter(event => event.metadata.severity === options.severity);
    }

    if (options.tags && options.tags.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        options.tags!.some(tag => event.metadata.tags.includes(tag))
      );
    }

    if (options.since) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= options.since!);
    }

    if (options.until) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= options.until!);
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredEvents.length;
    const limit = Math.min(options.limit || 50, 100);
    const offset = Math.max(options.offset || 0, 0);

    const paginatedEvents = filteredEvents.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events: paginatedEvents,
      total,
      hasMore,
      filters: {
        ...options,
        limit,
        offset
      }
    };
  }

  async createJob(input: RenderInput): Promise<RenderJob> {
    const jobId = crypto.randomUUID();
    const now = new Date();
    const timeout = input.processing?.timeout || this.DEFAULT_TIMEOUT;

    const job: RenderJob = {
      id: jobId,
      status: 'queued',
      phase: 'queued',
      progress: {
        percentage: 0,
        currentPhase: 'queued',
        phaseProgress: 0,
        estimatedTimeRemaining: timeout,
        message: this.getStatusMessage('queued', 'queued', input.targetLanguage)
      },
      createdAt: now,
      updatedAt: now,
      input,
      events: [],
      metadata: {
        processingLanguages: input.targetLanguage ? [input.targetLanguage] : [],
        sourceLanguage: input.sourceLanguage || 'auto',
        processingSteps: this.calculateProcessingSteps(input),
        totalEstimatedTime: timeout,
        actualProcessingTime: 0,
        retryCount: 0,
        lastError: null
      },
      retries: 0,
      timeoutAt: new Date(now.getTime() + timeout)
    };

    // Save to persistent storage
    await this.persistentStorage.saveJob(job);

    // Update in-memory cache
    this.jobs.set(jobId, job);
    this.eventHistory.set(jobId, []);

    // Add job created event
    await this.addEvent(
      jobId,
      'job_created',
      'queued',
      'queued',
      {
        jobId,
        input: job.input,
        estimatedDuration: timeout,
        processingSteps: job.metadata.processingSteps
      },
      {
        severity: 'info',
        category: 'system',
        tags: ['job_lifecycle', 'created']
      },
      input.targetLanguage
    );

    // Start processing in background
    this.processJob(jobId).catch(console.error);

    return job;
  }

  async getJob(id: string): Promise<RenderJob | null> {
    console.log(`[RenderService] Getting job ${id}`);

    // Try persistent storage first
    try {
      const persistentJob = await this.persistentStorage.getJob(id);
      if (persistentJob) {
        console.log(`[RenderService] Found job ${id} in persistent storage`);
        // Update in-memory cache for faster access
        this.jobs.set(id, persistentJob);
        return persistentJob;
      } else {
        console.log(`[RenderService] Job ${id} not found in persistent storage`);
      }
    } catch (error) {
      console.error(`[RenderService] Error getting job ${id} from persistent storage:`, error);
    }

    // Fall back to in-memory storage (for backward compatibility)
    const memoryJob = this.jobs.get(id) || null;
    if (memoryJob) {
      console.log(`[RenderService] Found job ${id} in memory cache`);
    } else {
      console.log(`[RenderService] Job ${id} not found in memory cache`);
    }
    return memoryJob;
  }

  async getAllJobs(): Promise<RenderJob[]> {
    // Try persistent storage first
    try {
      const persistentJobs = await this.persistentStorage.getAllJobs();
      if (persistentJobs.length > 0) {
        // Update in-memory cache
        persistentJobs.forEach(job => this.jobs.set(job.id, job));
        return persistentJobs;
      }
    } catch (error) {
      console.error('Error getting jobs from persistent storage:', error);
    }

    // Fall back to in-memory storage
    return Array.from(this.jobs.values());
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Add job deleted event
    await this.addEvent(
      jobId,
      'job_cancelled',
      job.status,
      job.phase,
      {
        jobId,
        deletedAt: new Date().toISOString(),
        reason: 'manual_deletion'
      },
      {
        severity: 'info',
        category: 'user',
        tags: ['job_lifecycle', 'deletion']
      }
    );

    this.jobs.delete(jobId);
    this.validationResults.delete(jobId);
    return true;
  }

  // Validation methods
  async startValidation(jobId: string, validationInput: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    await this.addEvent(
      jobId,
      'validation_started',
      'transcribing',
      job.phase,
      {
        jobId,
        validationInput: {
          fileName: validationInput.fileName,
          fileSize: validationInput.fileSize,
          mimeType: validationInput.mimeType
        },
        startedAt: new Date().toISOString()
      },
      {
        severity: 'info',
        category: 'validation',
        tags: ['validation_started', 'video_processing']
      }
    );
  }

  async completeValidation(jobId: string, validationResult: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.validationResults.set(jobId, validationResult);

    await this.addEvent(
      jobId,
      'validation_completed',
      validationResult.isValid ? 'done' : 'failed',
      job.phase,
      {
        jobId,
        validationResult: {
          isValid: validationResult.isValid,
          errorsCount: validationResult.errors?.length || 0,
          warningsCount: validationResult.warnings?.length || 0,
          processingTime: validationResult.processingTime,
          metadata: validationResult.metadata,
          languageDetection: validationResult.languageDetection
        },
        completedAt: new Date().toISOString()
      },
      {
        severity: validationResult.isValid ? 'success' : 'error',
        category: 'validation',
        tags: validationResult.isValid ? ['validation_completed', 'success'] : ['validation_failed', 'error']
      }
    );

    // If validation failed, update job status
    if (!validationResult.isValid) {
      job.status = 'failed';
      job.error = 'Video validation failed';
      job.updatedAt = new Date();

      await this.addEvent(
        jobId,
        'job_failed',
        'failed',
        'failed',
        {
          jobId,
          error: job.error,
          validationErrors: validationResult.errors,
          failedAt: job.updatedAt.toISOString()
        },
        {
          severity: 'error',
          category: 'validation',
          tags: ['validation_failure', 'job_failed']
        }
      );
    }
  }

  async getValidationResult(jobId: string): Promise<any | null> {
    return this.validationResults.get(jobId) || null;
  }

  async hasValidationResult(jobId: string): Promise<boolean> {
    return this.validationResults.has(jobId);
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') return;

    try {
      // Check if validation is required
      if (job.input.validation) {
        const validationResult = await this.getValidationResult(jobId);

        // If validation hasn't been completed yet, wait for it
        if (!validationResult) {
          await this.addEvent(
            jobId,
            'job_progress',
            'queued',
            'queued',
            {
              jobId,
              progress: 0,
              message: 'Waiting for video validation to complete',
              estimatedTimeRemaining: 5000
            },
            {
              severity: 'info',
              category: 'processing',
              tags: ['validation_pending', 'waiting']
            }
          );

          // Return early - actual processing will happen after validation
          return;
        }

        // Check if validation failed
        if (!validationResult.isValid) {
          // Validation failed event was already added in completeValidation
          await this.updateJobStatus(jobId, 'failed', 'failed', {
            reason: 'validation_failed',
            error: 'Video validation failed'
          });
          return;
        }
      }

      // Start processing with status flow
      await this.processPhaseWithRetry(jobId, 'transcribing');
      await this.processPhaseWithRetry(jobId, 'translating');
      await this.processPhaseWithRetry(jobId, 'rendering');
      await this.processPhaseWithRetry(jobId, 'uploading');

      // Complete the job
      await this.completeJob(jobId);

    } catch (error) {
      await this.handleJobError(jobId, error);
    }
  }

  private async processPhaseWithRetry(jobId: string, phase: ProcessingPhase): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const step = job.metadata.processingSteps.find(s => s.phase === phase);
    if (!step) return;

    let attempt = 0;
    const maxAttempts = job.input.processing?.maxRetries || this.MAX_RETRIES;

    while (attempt <= maxAttempts) {
      attempt++;

      try {
        // Update step status
        step.status = 'running';
        step.startTime = new Date();

        await this.updateJobStatus(jobId, phase, phase, {
          phase,
          attempt,
          stepName: step.name
        });

        // Simulate phase processing with progress updates
        await this.simulatePhaseProcessing(jobId, phase, step);

        // Mark step as completed
        step.status = 'completed';
        step.endTime = new Date();
        step.actualDuration = step.endTime.getTime() - step.startTime.getTime();

        await this.addEvent(
          jobId,
          'processing_step',
          job.status,
          phase,
          {
            jobId,
            phase,
            step: step.name,
            duration: step.actualDuration,
            completedAt: step.endTime.toISOString()
          },
          {
            severity: 'success',
            category: 'processing',
            tags: ['phase_completed', phase]
          }
        );

        return; // Success

      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';

        if (attempt > maxAttempts) {
          await this.handleJobError(jobId, error, phase);
          return;
        }

        // Add retry event
        await this.addEvent(
          jobId,
          'job_progress',
          job.status,
          phase,
          {
            jobId,
            phase,
            attempt,
            maxAttempts,
            error: step.error,
            retryDelay: Math.min(2000 * attempt, 10000)
          },
          {
            severity: 'warning',
            category: 'processing',
            tags: ['retry', 'error', phase]
          }
        );

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.min(2000 * attempt, 10000)));
      }
    }
  }

  private async simulatePhaseProcessing(jobId: string, phase: ProcessingPhase, step: ProcessingStep): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const progressSteps = [0, 25, 50, 75, 100];
    const stepDuration = step.estimatedDuration;

    for (let i = 0; i < progressSteps.length; i++) {
      const progress = progressSteps[i];
      const phaseProgress = this.calculatePhaseProgress(phase, progress);

      await this.addEvent(
        jobId,
        'job_progress',
        job.status || phase,
        phase,
        {
          jobId,
          progress,
          phaseProgress,
          phase,
          message: this.getStatusMessage(job.status || phase, phase, job.input.targetLanguage),
          estimatedTimeRemaining: Math.max(0, stepDuration - (stepDuration * progress / 100)),
          stepProgress: progress
        },
        {
          severity: 'info',
          category: 'processing',
          tags: ['progress', phase]
        },
        job.input.targetLanguage
      );

      // Emit language-specific events
      if (phase === 'translating' && progress === 50) {
        await this.emitLanguageSpecificEvents(jobId);
      }

      if (i < progressSteps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, stepDuration / (progressSteps.length - 1)));
      }
    }
  }

  private async emitLanguageSpecificEvents(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.input.targetLanguage) return;

    // Language detection event
    await this.addEvent(
      jobId,
      'language_detected',
      job.status,
      job.phase,
      {
        jobId,
        detectedLanguage: job.input.sourceLanguage || 'auto',
        confidence: 0.95,
        processingTime: 1500,
        alternatives: [
          { language: 'en', confidence: 0.85 },
          { language: 'es', confidence: 0.72 }
        ]
      },
      {
        severity: 'info',
        category: 'language',
        tags: ['language_detection', 'processing']
      },
      job.input.targetLanguage
    );

    // Translation sample event
    await this.addEvent(
      jobId,
      'translation_sample',
      job.status,
      job.phase,
      {
        jobId,
        sample: this.getTranslationSample(job.input.targetLanguage),
        confidence: 0.89,
        processingTime: 800
      },
      {
        severity: 'info',
        category: 'language',
        tags: ['translation', 'sample', job.input.targetLanguage]
      },
      job.input.targetLanguage
    );
  }

  private getTranslationSample(language: string): string {
    const samples = {
      'es': 'Hola, ¿cómo estás? Bienvenido a nuestra plataforma.',
      'fr': 'Bonjour, comment allez-vous? Bienvenue sur notre plateforme.',
      'hi': 'नमस्ते, आप कैसे हैं? हमारे प्लेटफॉर्म पर आपका स्वागत है।',
      'vi': 'Xin chào, bạn khỏe không? Chào mừng bạn đến với nền tảng của chúng tôi.'
    };
    return samples[language as keyof typeof samples] || 'Hello, how are you? Welcome to our platform.';
  }

  private async completeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'done';
    job.phase = 'done';
    job.updatedAt = new Date();
    job.completedAt = new Date();

    const validationResult = await this.getValidationResult(jobId);

    job.output = {
      url: `/api/renders/${jobId}/result`,
      fileUrl: `/uploads/${jobId}/output.mp4`,
      downloadUrl: `/api/renders/${jobId}/download`,
      previewUrl: `/api/renders/${jobId}/preview`,
      metadata: {
        processedAt: new Date().toISOString(),
        duration: job.metadata.actualProcessingTime,
        size: '2.4MB',
        format: 'mp4',
        resolution: { width: 1920, height: 1080 },
        quality: 'high',
        languages: job.metadata.processingLanguages,
        processingStats: {
          totalSegments: 25,
          successfulSegments: 25,
          failedSegments: 0,
          averageConfidence: 0.92
        }
      },
      validation: validationResult ? {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        result: validationResult
      } : undefined,
      processing: {
        renderTime: 60000,
        uploadTime: 10000,
        totalTime: job.metadata.actualProcessingTime,
        success: true
      },
      languages: job.metadata.processingLanguages.map(lang => ({
        language: lang,
        confidence: 0.92,
        segments: 25,
        processingTime: 30000,
        sample: this.getTranslationSample(lang)
      }))
    };

    await this.addEvent(
      jobId,
      'job_completed',
      'done',
      'done',
      {
        jobId,
        output: job.output,
        duration: job.metadata.actualProcessingTime,
        processingStats: {
          totalSteps: job.metadata.processingSteps.length,
          completedSteps: job.metadata.processingSteps.filter(s => s.status === 'completed').length,
          failedSteps: job.metadata.processingSteps.filter(s => s.status === 'failed').length,
          averageProcessingTime: job.metadata.actualProcessingTime / job.metadata.processingSteps.length
        },
        completedAt: job.completedAt.toISOString()
      },
      {
        severity: 'success',
        category: 'processing',
        tags: ['completion', 'success']
      },
      job.input.targetLanguage
    );
  }

  private async handleJobError(jobId: string, error: any, phase?: ProcessingPhase): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.phase = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.updatedAt = new Date();
    job.completedAt = new Date();
    job.metadata.lastError = job.error;
    job.metadata.actualProcessingTime = job.updatedAt.getTime() - job.createdAt.getTime();

    await this.addEvent(
      jobId,
      'job_failed',
      'failed',
      'failed',
      {
        jobId,
        error: job.error,
        phase: phase || job.phase,
        failedAt: job.updatedAt.toISOString(),
        processingTime: job.metadata.actualProcessingTime,
        stackTrace: error instanceof Error ? error.stack : undefined,
        retryCount: job.retries
      },
      {
        severity: 'error',
        category: 'processing',
        tags: ['error', 'failure', phase || 'unknown']
      },
      job.input.targetLanguage
    );
  }
}

export const renderService = new RenderService();