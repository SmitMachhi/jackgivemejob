import { NextRequest, NextResponse } from "next/server";
import {
  renderService,
  type EventType,
  type EventSeverity,
  type EventCategory,
} from "@/lib/services/render-service";

// Type definitions for job data and events
interface JobStatusHistory {
  timestamp?: string;
  status: string;
  phase?: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  severity?: string;
  processingTime?: number;
}

interface JobProgressStep {
  timestamp?: string;
  name: string;
  progress?: number;
  estimatedTimeRemaining?: number;
  message?: string;
  phase?: string;
  processingTime?: number;
}

interface JobTranslationSample {
  original: string;
  translated: string;
  confidence: number;
  segmentId?: string;
  timestamp?: string;
  processingTime?: number;
}

interface JobRenderProgress {
  timestamp?: string;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  estimatedTimeRemaining: number;
  currentLanguage: string;
  processingTime?: number;
}

interface JobUploadProgress {
  timestamp?: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  processingTime?: number;
}

interface JobValidation {
  status: "passed" | "failed";
  timestamp?: string;
  errors?: unknown[];
  warnings?: unknown[];
  metrics?: Record<string, unknown>;
  processingTime?: number;
}

interface JobOutput {
  url?: string;
  fileUrl?: string;
  downloadUrl?: string;
  previewUrl?: string;
  metadata?: {
    processedAt: string;
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
  };
  validation?: JobValidation;
  processing?: {
    renderTime: number;
    uploadTime: number;
    totalTime: number;
    success: boolean;
  };
  languages?: Array<{
    language: string;
    confidence: number;
    segments: number;
    processingTime: number;
    sample: string;
  }>;
  translationSamples?: Record<string, JobTranslationSample[]>;
}

interface JobMetadata {
  processingLanguages: string[];
  sourceLanguage?: string;
  processingSteps: Array<{
    id: string;
    name: string;
    phase: string;
    estimatedDuration: number;
    actualDuration?: number;
    status: string;
    startTime?: Date;
    endTime?: Date;
    error?: string;
  }>;
  totalEstimatedTime: number;
  actualProcessingTime: number;
  retryCount: number;
  lastError: string | null;
  timeoutHandling?: {
    timeoutAt: Date;
    extensions: number;
    maxExtensions: number;
  };
  detectedLanguage?: string;
  languageConfidence?: number;
  languageAlternatives?: Array<{
    language: string;
    confidence: number;
  }>;
  languageDetectedAt?: string;
  languageDetectionTime?: number;
  renderProgress?: JobRenderProgress[];
  uploadProgress?: JobUploadProgress;
  statusHistory?: JobStatusHistory[];
}

interface JobProgress {
  percentage: number;
  currentPhase: string;
  phaseProgress: number;
  estimatedTimeRemaining: number;
  message: string;
  stepDetails?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Enhanced event type enum
const EVENT_TYPES = [
  "job_created",
  "status_changed",
  "job_progress",
  "job_completed",
  "job_failed",
  "job_cancelled",
  "validation_started",
  "validation_completed",
  "validation_failed",
  "processing_started",
  "processing_step",
  "language_detected",
  "translation_sample",
  "render_progress",
  "upload_progress",
] as const;

// Interface for normalized event structure
interface JobEvent {
  id: string;
  type: EventType;
  timestamp: string;
  status: string;
  phase: string;
  data: Record<string, unknown>;
  metadata: {
    severity: EventSeverity;
    category: EventCategory;
    tags: string[];
    language?: string;
    retryCount?: number;
    processingTime?: number;
  };
  language?: string;
  sessionId?: string;
}

// Interface for pagination
interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Interface for enhanced query parameters
interface EventQueryParams extends PaginationParams {
  type?: EventType;
  stream?: boolean;
  since?: string;
  until?: string;
  severity?: EventSeverity;
  category?: EventCategory;
  language?: string;
  phase?: string;
  tags?: string;
  includeProgress?: boolean;
  includeSamples?: boolean;
  limit?: number;
}

// Helper function to parse enhanced query parameters
function parseQueryParams(request: NextRequest): EventQueryParams {
  const { searchParams } = new URL(request.url);

  return {
    limit: Math.min(Number(searchParams.get("limit")) || 50, 100),
    offset: Math.max(Number(searchParams.get("offset")) || 0, 0),
    type: searchParams.get("type") as EventType,
    stream: searchParams.get("stream") === "true",
    since: searchParams.get("since") || undefined,
    until: searchParams.get("until") || undefined,
    severity: searchParams.get("severity") as EventSeverity,
    category: searchParams.get("category") as EventCategory,
    language: searchParams.get("language") || undefined,
    phase: searchParams.get("phase") || undefined,
    tags: searchParams.get("tags") || undefined,
    includeProgress: searchParams.get("includeProgress") === "true",
    includeSamples: searchParams.get("includeSamples") === "true",
  };
}

// Adapter functions to convert between RenderJob and expected interface types
function adaptRenderJobToEventsJob(job: any): any {
  return {
    id: job.id,
    status: job.status,
    phase: job.phase,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    input: {
      ...job.input,
      targetLanguage: job.input?.targetLanguage,
    } as Record<string, unknown>,
    output: job.output ? adaptRenderOutputToJobOutput(job.output) : undefined,
    error: job.error,
    metadata: job.metadata,
    progress: job.progress
  };
}

function adaptRenderOutputToJobOutput(renderOutput: any): JobOutput {
  return {
    url: renderOutput.url,
    fileUrl: renderOutput.fileUrl,
    downloadUrl: renderOutput.downloadUrl,
    previewUrl: renderOutput.previewUrl,
    metadata: renderOutput.metadata ? {
      processedAt: renderOutput.metadata.processedAt instanceof Date
        ? renderOutput.metadata.processedAt.toISOString()
        : renderOutput.metadata.processedAt,
      duration: renderOutput.metadata.duration,
      size: renderOutput.metadata.size,
      format: renderOutput.metadata.format,
      resolution: renderOutput.metadata.resolution,
      quality: renderOutput.metadata.quality,
      languages: renderOutput.metadata.languages || [],
      processingStats: renderOutput.metadata.processingStats || {
        totalSegments: 0,
        successfulSegments: 0,
        failedSegments: 0,
        averageConfidence: 0
      }
    } : undefined
  };
}

function adaptRenderJobToSSEJob(job: any): any {
  return {
    id: job.id,
    status: job.status,
    phase: job.phase,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    progress: job.progress,
    completedAt: job.completedAt,
    input: {
      ...job.input,
      targetLanguage: job.input?.targetLanguage,
    } as Record<string, unknown>,
    output: job.output ? adaptRenderOutputToJobOutput(job.output) : undefined,
    error: job.error,
    metadata: job.metadata
  };
}

// Helper function to generate job events based on job status and metadata
function generateJobEvents(
  jobId: string,
  job: {
    id: string;
    status: string;
    phase: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    input: {
      targetLanguage?: string;
      [key: string]: unknown;
    };
    output?: JobOutput;
    error?: string;
    metadata: JobMetadata;
    progress: JobProgress;
  }
): JobEvent[] {
  const events: JobEvent[] = [];
  const now = new Date().toISOString();

  // Job created event
  events.push({
    id: `${jobId}-created`,
    type: "job_created",
    timestamp: job.createdAt.toISOString(),
    status: job.status,
    phase: job.phase,
    data: {
      jobId,
      input: job.input,
      metadata: job.metadata,
    },
    metadata: {
      severity: "info",
      category: "system",
      tags: ["job", "created"],
      processingTime: 0,
    },
  });

  // Status change events
  if (job.metadata.statusHistory && Array.isArray(job.metadata.statusHistory)) {
    job.metadata.statusHistory.forEach(
      (historyEntry: JobStatusHistory, index: number) => {
        events.push({
          id: `${jobId}-status-${index}`,
          type: "status_changed",
          timestamp: historyEntry.timestamp || now,
          status: historyEntry.status,
          phase: historyEntry.phase || job.phase,
          data: {
            fromStatus: historyEntry.fromStatus,
            toStatus: historyEntry.toStatus,
            reason: historyEntry.reason,
          },
          metadata: {
            severity: (historyEntry.severity || "info") as EventSeverity,
            category: "system" as EventCategory,
            tags: ["status", "change"],
            processingTime: historyEntry.processingTime || 0,
          },
        });
      }
    );
  }

  // Progress events
  if (job.progress.stepDetails) {
    const steps = Array.isArray(job.progress.stepDetails)
      ? job.progress.stepDetails
      : [job.progress.stepDetails];
    steps.forEach((step: JobProgressStep, index: number) => {
      events.push({
        id: `${jobId}-progress-${index}`,
        type: "job_progress",
        timestamp: step.timestamp || now,
        status: job.status,
        phase: step.phase || job.phase,
        data: {
          stepName: step.name,
          progress: step.progress,
          estimatedTimeRemaining: step.estimatedTimeRemaining,
          message: step.message,
        },
        metadata: {
          severity: "info" as EventSeverity,
          category: "processing" as EventCategory,
          tags: ["progress", step.phase || ""],
          processingTime: step.processingTime || 0,
        },
      });
    });
  }

  // Language detection event
  if (job.metadata.detectedLanguage) {
    events.push({
      id: `${jobId}-language-detected`,
      type: "language_detected",
      timestamp: job.metadata.languageDetectedAt || now,
      status: job.status,
      phase: job.phase,
      data: {
        detectedLanguage: job.metadata.detectedLanguage,
        confidence: job.metadata.languageConfidence,
        alternatives: job.metadata.languageAlternatives || [],
      },
      metadata: {
        severity: "info",
        category: "language",
        tags: ["language", "detection"],
        language: job.metadata.detectedLanguage,
        processingTime: job.metadata.languageDetectionTime || 0,
      },
    });
  }

  // Translation sample events
  if (job.output?.translationSamples) {
    Object.entries(job.output.translationSamples).forEach(
      ([language, samples]: [string, JobTranslationSample[]]) => {
        if (samples && samples.length > 0) {
          samples.forEach((sample: JobTranslationSample, index: number) => {
            events.push({
              id: `${jobId}-translation-sample-${language}-${index}`,
              type: "translation_sample",
              timestamp: sample.timestamp || now,
              status: job.status,
              phase: "translating",
              data: {
                language,
                originalText: sample.original,
                translatedText: sample.translated,
                confidence: sample.confidence,
                segmentId: sample.segmentId,
              },
              metadata: {
                severity: "info",
                category: "language",
                tags: ["translation", "sample", language],
                language,
                processingTime: sample.processingTime || 0,
              },
            });
          });
        }
      }
    );
  }

  // Render progress events
  if (job.metadata.renderProgress) {
    job.metadata.renderProgress.forEach(
      (progress: JobRenderProgress, index: number) => {
        events.push({
          id: `${jobId}-render-progress-${index}`,
          type: "render_progress",
          timestamp: progress.timestamp || now,
          status: job.status,
          phase: "rendering",
          data: {
            currentFrame: progress.currentFrame,
            totalFrames: progress.totalFrames,
            fps: progress.fps,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
            currentLanguage: progress.currentLanguage,
          },
          metadata: {
            severity: "info",
            category: "render",
            tags: ["render", "progress"],
            language: progress.currentLanguage,
            processingTime: progress.processingTime || 0,
          },
        });
      }
    );
  }

  // Upload progress events
  if (job.metadata.uploadProgress) {
    const uploadProgress = job.metadata.uploadProgress;
    events.push({
      id: `${jobId}-upload-progress`,
      type: "upload_progress",
      timestamp: uploadProgress.timestamp || now,
      status: job.status,
      phase: "uploading",
      data: {
        bytesUploaded: uploadProgress.bytesUploaded,
        totalBytes: uploadProgress.totalBytes,
        percentage: uploadProgress.percentage,
        speed: uploadProgress.speed,
      },
      metadata: {
        severity: "info",
        category: "upload",
        tags: ["upload", "progress"],
        processingTime: uploadProgress.processingTime || 0,
      },
    });
  }

  // Job completion/failure events
  if (job.status === "done" || job.status === "failed") {
    events.push({
      id: `${jobId}-${job.status}`,
      type: job.status === "done" ? "job_completed" : "job_failed",
      timestamp: job.completedAt?.toISOString() || now,
      status: job.status,
      phase: job.phase,
      data: {
        result: job.output,
        error: job.error,
        totalProcessingTime: job.metadata.actualProcessingTime,
        retryCount: job.metadata.retryCount,
      },
      metadata: {
        severity: job.status === "done" ? "success" : "error",
        category: "system",
        tags: ["job", job.status],
        processingTime: job.metadata.actualProcessingTime || 0,
        retryCount: job.metadata.retryCount || 0,
      },
    });
  }

  // Validation events
  if (job.output?.validation) {
    const validation = job.output.validation;
    events.push({
      id: `${jobId}-validation-${validation.status}`,
      type:
        validation.status === "passed"
          ? "validation_completed"
          : "validation_failed",
      timestamp: validation.timestamp || now,
      status: job.status,
      phase: job.phase,
      data: {
        validationStatus: validation.status,
        errors: validation.errors,
        warnings: validation.warnings,
        metrics: validation.metrics,
      },
      metadata: {
        severity: validation.status === "passed" ? "success" : "error",
        category: "validation",
        tags: ["validation", validation.status],
        processingTime: validation.processingTime || 0,
      },
    });
  }

  // Processing started event
  if (job.startedAt) {
    events.push({
      id: `${jobId}-processing-started`,
      type: "processing_started",
      timestamp: job.startedAt.toISOString(),
      status: job.status,
      phase: job.phase,
      data: {
        estimatedDuration: job.metadata.totalEstimatedTime,
        processingLanguages: job.metadata.processingLanguages,
      },
      metadata: {
        severity: "info",
        category: "processing",
        tags: ["processing", "started"],
        language: job.metadata.detectedLanguage,
        processingTime: 0,
      },
    });
  }

  // Language detection event (if available in metadata)
  if (job.metadata.detectedLanguage) {
    events.push({
      id: `${jobId}-language-detected`,
      type: "language_detected",
      timestamp: job.metadata.languageDetectedAt || now,
      status: job.status,
      phase: job.phase,
      data: {
        detectedLanguage: job.metadata.detectedLanguage,
        confidence: job.metadata.languageConfidence || 0.95,
        alternatives: job.metadata.languageAlternatives || [],
      },
      metadata: {
        severity: "info",
        category: "language",
        tags: ["language", "detection"],
        language: job.metadata.detectedLanguage,
        processingTime: job.metadata.languageDetectionTime || 0,
      },
    });
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Helper function to filter events with enhanced options
function filterEvents(
  events: JobEvent[],
  params: EventQueryParams
): JobEvent[] {
  let filtered = [...events];

  // Enhanced filtering
  if (params.type) {
    filtered = filtered.filter((event) => event.type === params.type);
  }

  if (params.severity) {
    filtered = filtered.filter(
      (event) => event.metadata.severity === params.severity
    );
  }

  if (params.category) {
    filtered = filtered.filter(
      (event) => event.metadata.category === params.category
    );
  }

  if (params.language) {
    filtered = filtered.filter(
      (event) =>
        event.language === params.language ||
        event.metadata.language === params.language
    );
  }

  if (params.phase) {
    filtered = filtered.filter((event) => event.phase === params.phase);
  }

  if (params.tags) {
    const tagList = params.tags.split(",").map((tag) => tag.trim());
    filtered = filtered.filter((event) =>
      tagList.some((tag) => event.metadata.tags.includes(tag))
    );
  }

  // Filter by timestamp
  if (params.since) {
    const sinceTimestamp = new Date(params.since).getTime();
    filtered = filtered.filter(
      (event) => new Date(event.timestamp).getTime() >= sinceTimestamp
    );
  }

  if (params.until) {
    const untilTimestamp = new Date(params.until).getTime();
    filtered = filtered.filter(
      (event) => new Date(event.timestamp).getTime() <= untilTimestamp
    );
  }

  // Content-based filtering
  if (!params.includeProgress) {
    filtered = filtered.filter((event) => event.type !== "job_progress");
  }

  if (!params.includeSamples) {
    filtered = filtered.filter((event) => event.type !== "translation_sample");
  }

  // Sort by timestamp (newest first)
  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return filtered;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;

    // Validate job ID format
    if (!id) {
      return NextResponse.json(
        {
          error: "Job ID is required",
          code: "MISSING_JOB_ID",
        },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        {
          error: "Invalid job ID format",
          code: "INVALID_JOB_ID_FORMAT",
          details: "Job ID must be a valid UUID",
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await renderService.getJob(id);
    if (!job) {
      return NextResponse.json(
        {
          error: "Job not found",
          code: "JOB_NOT_FOUND",
          jobId: id,
        },
        { status: 404 }
      );
    }

    // Parse query parameters
    const queryParams = parseQueryParams(request);

    // Handle SSE for real-time updates
    if (queryParams.stream) {
      return handleServerSentEvents(request, id, adaptRenderJobToSSEJob(job), queryParams);
    }

    // Generate and filter events
    const allEvents = generateJobEvents(id, adaptRenderJobToEventsJob(job));
    const filteredEvents = filterEvents(allEvents, queryParams);

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(
      queryParams.offset || 0,
      (queryParams.offset || 0) + (queryParams.limit || 50)
    );

    // Return structured response
    const response = {
      events: paginatedEvents,
      pagination: {
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        total: filteredEvents.length,
        hasMore: (queryParams.offset || 0) + (queryParams.limit || 50) < filteredEvents.length,
      },
      jobStatus: job.status,
      metadata: {
        jobId: id,
        availableEventTypes: EVENT_TYPES,
        filters: {
          type: queryParams.type || null,
          since: queryParams.since || null,
        },
      },
    };

    // Add caching headers
    const headers = new Headers({
      "Cache-Control": "public, max-age=2, stale-while-revalidate=5",
      ETag: `"events-${id}-${job.updatedAt.getTime()}"`,
      "Content-Type": "application/json",
    });

    return NextResponse.json(response, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Get job events error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch job events",
        code: "INTERNAL_ERROR",
        details:
          process.env.NODE_ENV === "development" ? (error as Error)?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle Server-Sent Events for real-time updates
async function handleServerSentEvents(
  request: NextRequest,
  jobId: string,
  job: {
    id: string;
    status: string;
    phase: string;
    updatedAt: Date;
    progress: JobProgress;
    completedAt?: Date;
    output?: JobOutput;
    error?: string;
    metadata: JobMetadata;
  },
  params: EventQueryParams
): Promise<NextResponse> {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial events
  const allEvents = generateJobEvents(jobId, adaptRenderJobToEventsJob(job));
  const filteredEvents = filterEvents(allEvents, params);

  // Send initial data
  const initialData = {
    type: "initial",
    events: filteredEvents,
    jobStatus: job.status,
    jobPhase: job.phase,
    jobProgress: job.progress,
    timestamp: new Date().toISOString(),
  };

  writer.write(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

  // Track last event timestamp to avoid duplicates
  let lastEventTimestamp = job.updatedAt.getTime();
  let lastStatus = job.status;
  let lastProgress = job.progress.percentage;

  // Set up enhanced real-time updates
  const interval = setInterval(async () => {
    try {
      // Check for job updates
      const currentJob = await renderService.getJob(jobId);
      if (!currentJob) {
        // Job was deleted
        const deleteEvent = {
          type: "job_deleted",
          data: { jobId, deletedAt: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        };
        writer.write(
          encoder.encode(`data: ${JSON.stringify(deleteEvent)}\n\n`)
        );
        clearInterval(interval);
        writer.close();
        return;
      }

      // Check for status changes
      if (currentJob.status !== lastStatus) {
        const statusChangeEvent = {
          type: "status_changed",
          data: {
            fromStatus: lastStatus,
            toStatus: currentJob.status,
            phase: currentJob.phase,
            timestamp: currentJob.updatedAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
        writer.write(
          encoder.encode(`data: ${JSON.stringify(statusChangeEvent)}\n\n`)
        );
        lastStatus = currentJob.status;
      }

      // Check for progress updates
      if (currentJob.progress.percentage !== lastProgress) {
        const progressEvent = {
          type: "job_progress",
          data: {
            percentage: currentJob.progress.percentage,
            phase: currentJob.progress.currentPhase,
            phaseProgress: currentJob.progress.phaseProgress,
            estimatedTimeRemaining: currentJob.progress.estimatedTimeRemaining,
            message: currentJob.progress.message,
            stepDetails: currentJob.progress.stepDetails,
          },
          timestamp: new Date().toISOString(),
        };
        writer.write(
          encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`)
        );
        lastProgress = currentJob.progress.percentage;
      }

      // Generate and send new events if job was updated
      if (currentJob.updatedAt.getTime() > lastEventTimestamp) {
        const newEvents = generateJobEvents(jobId, adaptRenderJobToEventsJob(currentJob));
        const newFilteredEvents = filterEvents(newEvents, params);

        // Only send events that are newer than the last timestamp
        const recentEvents = newFilteredEvents.filter(
          (event) => new Date(event.timestamp).getTime() > lastEventTimestamp
        );

        if (recentEvents.length > 0) {
          const eventsData = {
            type: "events_update",
            events: recentEvents,
            jobStatus: currentJob.status,
            jobPhase: currentJob.phase,
            jobProgress: currentJob.progress,
            timestamp: new Date().toISOString(),
          };
          writer.write(
            encoder.encode(`data: ${JSON.stringify(eventsData)}\n\n`)
          );
          lastEventTimestamp = Math.max(
            ...recentEvents.map((event) => new Date(event.timestamp).getTime())
          );
        }
      }

      // Send enhanced heartbeat with job state
      const heartbeat = {
        type: "heartbeat",
        jobStatus: currentJob.status,
        jobPhase: currentJob.phase,
        jobProgress: currentJob.progress.percentage,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };
      writer.write(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));

      // If job is completed or failed, send final event and close connection
      if (currentJob.status === "done" || currentJob.status === "failed") {
        const finalEvent = {
          type:
            currentJob.status === "done" ? "job_completed" : "job_failed",
          data: {
            jobId,
            finalStatus: currentJob.status,
            output: currentJob.output,
            error: currentJob.error,
            totalProcessingTime: currentJob.metadata.actualProcessingTime,
            completedAt: currentJob.completedAt?.toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
        writer.write(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`));

        // Close connection after final event
        setTimeout(() => {
          clearInterval(interval);
          try {
            writer.close();
          } catch {
            // Writer might already be closed
          }
        }, 2000);
      }
    } catch (sseError) {
      // Error occurred, but we'll continue with a generic error
      console.error("SSE error:", sseError);
      const errorEvent = {
        type: "error",
        data: {
          message: "Failed to fetch job updates",
          error: "Unknown error",
        },
        timestamp: new Date().toISOString(),
      };
      try {
        writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      } catch {
        // Writer might already be closed
      }
      clearInterval(interval);
      try {
        writer.close();
      } catch {
        // Writer might already be closed
      }
    }
  }, 2000); // Send update every 2 seconds for more responsive updates

  // Enhanced connection cleanup
  const cleanup = () => {
    clearInterval(interval);
    try {
      writer.close();
    } catch {
      // Writer might already be closed
    }
  };

  // Clean up on connection close or abort
  request.signal.addEventListener("abort", cleanup);

  // Set connection timeout (5 minutes)
  const timeout = setTimeout(() => {
    const timeoutEvent = {
      type: "timeout",
      data: {
        message: "Connection timeout",
        duration: 300000,
      },
      timestamp: new Date().toISOString(),
    };
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(timeoutEvent)}\n\n`));
    } catch {
      // Writer might already be closed
    }
    cleanup();
  }, 300000);

  // Clear timeout on cleanup
  request.signal.addEventListener("abort", () => {
    clearTimeout(timeout);
  });

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no", // Disable buffering for Nginx
      "Content-Encoding": "none", // Prevent compression
    },
  });
}
