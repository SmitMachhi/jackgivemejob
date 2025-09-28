export interface RenderJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  input: RenderInput;
  output?: RenderOutput;
  error?: string;
  events: JobEvent[];
}

export interface RenderInput {
  templateId?: string;
  data: Record<string, any>;
  format?: 'pdf' | 'html' | 'image';
  options?: Record<string, any>;
  targetLanguage?: string;
  validation?: {
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
  };
}

export interface RenderOutput {
  url?: string;
  fileUrl?: string;
  metadata?: Record<string, any>;
  validation?: {
    result?: any;
    isValid?: boolean;
    errors?: any[];
    warnings?: any[];
  };
}

export interface JobEvent {
  eventId: string;
  timestamp: Date;
  type: 'job_created' | 'status_changed' | 'job_completed' | 'job_failed' | 'job_progress' | 'job_cancelled' | 'validation_started' | 'validation_completed' | 'validation_failed';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details: Record<string, any>;
  metadata?: {
    severity?: 'info' | 'warning' | 'error' | 'success';
    category?: 'system' | 'user' | 'processing' | 'validation';
    tags?: string[];
  };
}

export interface EventQueryOptions {
  limit?: number;
  offset?: number;
  type?: JobEvent['type'];
  since?: Date;
  until?: Date;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export interface EventResult {
  events: JobEvent[];
  total: number;
  hasMore: boolean;
  filters: EventQueryOptions;
}

export class RenderService {
  private jobs: Map<string, RenderJob> = new Map();
  private validationResults: Map<string, any> = new Map();

  // Helper method to create an event
  private createEvent(
    type: JobEvent['type'],
    status: JobEvent['status'],
    details: Record<string, any>,
    metadata?: JobEvent['metadata']
  ): JobEvent {
    return {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      status,
      details,
      metadata
    };
  }

  // Method to append event to a job
  async addEvent(jobId: string, type: JobEvent['type'], status: JobEvent['status'], details: Record<string, any>, metadata?: JobEvent['metadata']): Promise<JobEvent | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const event = this.createEvent(type, status, details, metadata);
    job.events.push(event);
    job.updatedAt = new Date();

    return event;
  }

  // Method to retrieve events for a specific job with filtering and pagination
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

    let filteredEvents = [...job.events];

    // Apply filters
    if (options.type) {
      filteredEvents = filteredEvents.filter(event => event.type === options.type);
    }

    if (options.since) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= options.since!);
    }

    if (options.until) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= options.until!);
    }

    if (options.severity) {
      filteredEvents = filteredEvents.filter(event => event.metadata?.severity === options.severity);
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
    const job: RenderJob = {
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      input,
      events: []
    };

    this.jobs.set(job.id, job);

    // Add job created event
    await this.addEvent(
      job.id,
      'job_created',
      'pending',
      {
        jobId: job.id,
        input: job.input,
        createdAt: job.createdAt.toISOString()
      },
      {
        severity: 'info',
        category: 'system',
        tags: ['job_lifecycle']
      }
    );

    // Start processing in background
    this.processJob(job.id).catch(console.error);

    return job;
  }

  async getJob(id: string): Promise<RenderJob | null> {
    return this.jobs.get(id) || null;
  }

  async getAllJobs(): Promise<RenderJob[]> {
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
      'processing',
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
      validationResult.isValid ? 'completed' : 'failed',
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
    if (!job || job.status !== 'pending') return;

    try {
      // Check if validation is required
      if (job.input.validation) {
        const validationResult = await this.getValidationResult(jobId);

        // If validation hasn't been completed yet, wait for it
        if (!validationResult) {
          await this.addEvent(
            jobId,
            'job_progress',
            'processing',
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
          return;
        }
      }

      // Add processing started event
      job.status = 'processing';
      job.updatedAt = new Date();

      await this.addEvent(
        jobId,
        'status_changed',
        'processing',
        {
          jobId,
          previousStatus: 'pending',
          newStatus: 'processing',
          processingStartedAt: job.updatedAt.toISOString()
        },
        {
          severity: 'info',
          category: 'processing',
          tags: ['status_change', 'processing_started']
        }
      );

      // Simulate render processing with progress events
      const progressSteps = [25, 50, 75, 100];
      for (const progress of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500));

        await this.addEvent(
          jobId,
          'job_progress',
          'processing',
          {
            jobId,
            progress,
            message: `Rendering progress: ${progress}%`,
            estimatedTimeRemaining: ((100 - progress) / 100) * 2000
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['progress', 'rendering']
          }
        );
      }

      // Complete the job
      job.status = 'completed';
      job.updatedAt = new Date();

      const validationResult = await this.getValidationResult(jobId);

      job.output = {
        url: `/api/renders/${jobId}/result`,
        metadata: {
          processedAt: new Date().toISOString(),
          duration: 2000,
          size: '2.4MB',
          pages: 1
        },
        validation: validationResult ? {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          result: validationResult
        } : undefined
      };

      await this.addEvent(
        jobId,
        'job_completed',
        'completed',
        {
          jobId,
          output: job.output,
          duration: 2000,
          completedAt: job.updatedAt.toISOString()
        },
        {
          severity: 'success',
          category: 'processing',
          tags: ['completion', 'success']
        }
      );
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date();

      await this.addEvent(
        jobId,
        'job_failed',
        'failed',
        {
          jobId,
          error: job.error,
          failedAt: job.updatedAt.toISOString(),
          stackTrace: error instanceof Error ? error.stack : undefined
        },
        {
          severity: 'error',
          category: 'processing',
          tags: ['error', 'failure']
        }
      );
    }
  }
}

export const renderService = new RenderService();