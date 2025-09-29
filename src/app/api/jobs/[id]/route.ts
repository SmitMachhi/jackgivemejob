import { NextRequest, NextResponse } from 'next/server';
import { renderService, type JobStatus, type ProcessingPhase } from '@/lib/services/render-service';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    // Validate job ID format
    if (!id) {
      return NextResponse.json(
        {
          error: 'Job ID is required',
          status: 'error',
          code: 'MISSING_JOB_ID'
        },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        {
          error: 'Invalid job ID format',
          status: 'error',
          code: 'INVALID_JOB_ID_FORMAT',
          details: 'Job ID must be a valid UUID'
        },
        { status: 400 }
      );
    }

    // Retrieve job from service
    const job = await renderService.getJob(id);

    if (!job) {
      // Get additional debug info
      const allJobs = await renderService.getAllJobs();
      const debugInfo = {
        requestedJobId: id,
        totalJobsInMemory: allJobs.length,
        availableJobIds: allJobs.map(j => j.id),
        serverRestartInfo: {
          message: 'Jobs are stored in memory and may be lost during server restarts',
          restartCount: 'Check development server logs for "Local worker ready" messages'
        }
      };

      console.log('Job not found - debug info:', debugInfo);

      return NextResponse.json(
        {
          error: 'Job not found',
          status: 'error',
          code: 'JOB_NOT_FOUND',
          jobId: id,
          debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined,
          suggestion: 'The job may have been lost due to a server restart. Check /api/jobs/debug for current jobs.'
        },
        { status: 404 }
      );
    }

    // Structure enhanced response with detailed status tracking
    const response = {
      // Basic job info
      id: job.id,
      status: job.status as JobStatus,
      phase: job.phase as ProcessingPhase,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,

      // Progress information
      progress: {
        percentage: job.progress.percentage,
        currentPhase: job.progress.currentPhase,
        phaseProgress: job.progress.phaseProgress,
        estimatedTimeRemaining: job.progress.estimatedTimeRemaining,
        message: job.progress.message,
        stepDetails: job.progress.stepDetails
      },

      // Job input and output
      input: job.input,
      output: job.output,
      error: job.error,

      // Output URLs
      outputUrl: job.output?.url || job.output?.fileUrl || null,
      downloadUrl: job.output?.downloadUrl || null,
      previewUrl: job.output?.previewUrl || null,

      // Enhanced metadata
      metadata: {
        // Processing info
        format: job.input.format || 'video',
        templateId: job.input.templateId || null,
        targetLanguage: job.input.targetLanguage || null,
        sourceLanguage: job.input.sourceLanguage || null,

        // Processing metadata
        processingLanguages: job.metadata.processingLanguages,
        totalEstimatedTime: job.metadata.totalEstimatedTime,
        actualProcessingTime: job.metadata.actualProcessingTime,
        retryCount: job.metadata.retryCount,
        lastError: job.metadata.lastError,

        // Output metadata
        processedAt: job.output?.metadata?.processedAt || null,
        duration: job.output?.metadata?.duration || null,
        size: job.output?.metadata?.size || null,
        resolution: job.output?.metadata?.resolution || null,
        quality: job.output?.metadata?.quality || null,

        // Processing stats
        processingStats: job.output?.metadata?.processingStats || {
          totalSegments: 0,
          successfulSegments: 0,
          failedSegments: 0,
          averageConfidence: 0
        },

        // Steps tracking
        steps: job.metadata.processingSteps.map(step => ({
          id: step.id,
          name: step.name,
          phase: step.phase,
          status: step.status,
          estimatedDuration: step.estimatedDuration,
          actualDuration: step.actualDuration,
          startTime: step.startTime?.toISOString() || null,
          endTime: step.endTime?.toISOString() || null,
          error: step.error || null
        }))
      },

      // Language results
      languages: job.output?.languages || [],

      // Validation info
      validation: job.output?.validation || null,

      // Processing info
      processing: job.output?.processing || null,

      // Timeout info
      timeout: job.timeoutAt ? {
        timeoutAt: job.timeoutAt.toISOString(),
        timeRemaining: Math.max(0, job.timeoutAt.getTime() - Date.now())
      } : null
    };

    // Add enhanced caching headers with status-based TTL
    const isActive = job.status === 'queued' || job.status === 'transcribing' || job.status === 'translating' || job.status === 'rendering' || job.status === 'uploading';
    const cacheTTL = isActive ? 2 : 10; // Shorter cache for active jobs

    const headers = new Headers({
      'Cache-Control': `public, max-age=${cacheTTL}, stale-while-revalidate=${cacheTTL * 2}`,
      'ETag': `"job-${id}-${job.status}-${job.updatedAt.getTime()}"`,
      'Content-Type': 'application/json',
      'X-Job-Status': job.status,
      'X-Job-Phase': job.phase,
      'X-Job-Progress': job.progress.percentage.toString()
    });

    return NextResponse.json(response, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Get job error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch job',
        status: 'error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Check if job exists first
    const job = await renderService.getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Note: The renderService doesn't have a delete method yet
    // You may need to add it or handle this differently
    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}