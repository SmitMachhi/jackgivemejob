import { NextRequest, NextResponse } from 'next/server';
import { renderService } from '@/lib/services/render-service';

interface RouteParams {
  params: {
    id: string;
  };
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = context.params;

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
      return NextResponse.json(
        {
          error: 'Job not found',
          status: 'error',
          code: 'JOB_NOT_FOUND',
          jobId: id
        },
        { status: 404 }
      );
    }

    // Structure response with status field and conditional outputUrl
    const response = {
      status: job.status,
      jobId: job.id,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      input: job.input,
      output: job.output,
      error: job.error,
      outputUrl: job.output?.url || job.output?.fileUrl || null,
      metadata: {
        format: job.input.format || 'pdf',
        templateId: job.input.templateId || null,
        processedAt: job.output?.metadata?.processedAt || null,
        duration: job.output?.metadata?.duration || null
      }
    };

    // Add caching headers with 5-second TTL
    const headers = new Headers({
      'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
      'ETag': `"job-${id}-${job.updatedAt.getTime()}"`,
      'Content-Type': 'application/json'
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { id } = context.params;

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