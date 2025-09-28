import { NextRequest, NextResponse } from 'next/server';
import { renderService } from '@/lib/services/render-service';

interface RouteParams {
  params: {
    id: string;
  };
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Event type enum for filtering
const EVENT_TYPES = [
  'job_created',
  'status_changed',
  'job_completed',
  'job_failed',
  'job_progress',
  'job_cancelled'
] as const;

type EventType = typeof EVENT_TYPES[number];

// Interface for normalized event structure
interface JobEvent {
  id: string;
  type: EventType;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    severity?: 'info' | 'warning' | 'error' | 'success';
    category?: 'system' | 'user' | 'processing';
    tags?: string[];
  };
}

// Interface for pagination
interface PaginationParams {
  limit: number;
  offset: number;
}

// Interface for query parameters
interface EventQueryParams extends PaginationParams {
  type?: EventType;
  stream?: boolean;
  since?: string;
}

// Helper function to parse query parameters
function parseQueryParams(request: NextRequest): EventQueryParams {
  const { searchParams } = new URL(request.url);

  return {
    limit: Math.min(Number(searchParams.get('limit')) || 50, 100), // Max 100 items
    offset: Math.max(Number(searchParams.get('offset')) || 0, 0),
    type: searchParams.get('type') as EventType,
    stream: searchParams.get('stream') === 'true',
    since: searchParams.get('since') || undefined
  };
}

// Helper function to generate normalized events from job data
function generateJobEvents(jobId: string, job: any): JobEvent[] {
  const events: JobEvent[] = [];

  // Job created event
  events.push({
    id: `job-${jobId}-created`,
    type: 'job_created',
    timestamp: job.createdAt.toISOString(),
    data: {
      jobId: jobId,
      input: job.input,
      createdAt: job.createdAt.toISOString()
    },
    metadata: {
      severity: 'info',
      category: 'system',
      tags: ['job_lifecycle']
    }
  });

  // Status change event
  events.push({
    id: `job-${jobId}-status-${job.status}`,
    type: 'status_changed',
    timestamp: job.updatedAt.toISOString(),
    data: {
      jobId: jobId,
      status: job.status,
      previousStatus: job.status === 'pending' ? 'created' : 'processing',
      updatedAt: job.updatedAt.toISOString()
    },
    metadata: {
      severity: job.status === 'failed' ? 'error' : job.status === 'completed' ? 'success' : 'info',
      category: 'processing',
      tags: ['status_change']
    }
  });

  // Completion event
  if (job.status === 'completed' && job.output) {
    events.push({
      id: `job-${jobId}-completed`,
      type: 'job_completed',
      timestamp: job.updatedAt.toISOString(),
      data: {
        jobId: jobId,
        output: job.output,
        duration: job.output.metadata?.duration || 0,
        completedAt: job.updatedAt.toISOString()
      },
      metadata: {
        severity: 'success',
        category: 'processing',
        tags: ['completion']
      }
    });
  }

  // Error event
  if (job.status === 'failed' && job.error) {
    events.push({
      id: `job-${jobId}-failed`,
      type: 'job_failed',
      timestamp: job.updatedAt.toISOString(),
      data: {
        jobId: jobId,
        error: job.error,
        failedAt: job.updatedAt.toISOString()
      },
      metadata: {
        severity: 'error',
        category: 'processing',
        tags: ['error', 'failure']
      }
    });
  }

  return events;
}

// Helper function to filter events
function filterEvents(events: JobEvent[], params: EventQueryParams): JobEvent[] {
  let filtered = [...events];

  // Filter by type
  if (params.type) {
    filtered = filtered.filter(event => event.type === params.type);
  }

  // Filter by timestamp (since)
  if (params.since) {
    const sinceTimestamp = new Date(params.since).getTime();
    filtered = filtered.filter(event => new Date(event.timestamp).getTime() >= sinceTimestamp);
  }

  // Sort by timestamp (newest first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return filtered;
}

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
          code: 'INVALID_JOB_ID_FORMAT',
          details: 'Job ID must be a valid UUID'
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await renderService.getJob(id);
    if (!job) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
          jobId: id
        },
        { status: 404 }
      );
    }

    // Parse query parameters
    const queryParams = parseQueryParams(request);

    // Handle SSE for real-time updates
    if (queryParams.stream) {
      return handleServerSentEvents(id, job, queryParams);
    }

    // Generate and filter events
    const allEvents = generateJobEvents(id, job);
    const filteredEvents = filterEvents(allEvents, queryParams);

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(
      queryParams.offset,
      queryParams.offset + queryParams.limit
    );

    // Return structured response
    const response = {
      events: paginatedEvents,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: filteredEvents.length,
        hasMore: queryParams.offset + queryParams.limit < filteredEvents.length
      },
      jobStatus: job.status,
      metadata: {
        jobId: id,
        availableEventTypes: EVENT_TYPES,
        filters: {
          type: queryParams.type || null,
          since: queryParams.since || null
        }
      }
    };

    // Add caching headers
    const headers = new Headers({
      'Cache-Control': 'public, max-age=2, stale-while-revalidate=5',
      'ETag': `"events-${id}-${job.updatedAt.getTime()}"`,
      'Content-Type': 'application/json'
    });

    return NextResponse.json(response, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Get job events error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch job events',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Handle Server-Sent Events for real-time updates
async function handleServerSentEvents(
  jobId: string,
  job: any,
  params: EventQueryParams
): Promise<NextResponse> {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial events
  const allEvents = generateJobEvents(jobId, job);
  const filteredEvents = filterEvents(allEvents, params);

  // Send initial data
  const initialData = {
    type: 'initial',
    events: filteredEvents,
    jobStatus: job.status,
    timestamp: new Date().toISOString()
  };

  writer.write(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

  // Set up periodic status updates (simulated real-time updates)
  const interval = setInterval(async () => {
    try {
      // Check for job updates
      const currentJob = await renderService.getJob(jobId);
      if (!currentJob) {
        // Job was deleted
        const deleteEvent = {
          type: 'job_deleted',
          data: { jobId, deletedAt: new Date().toISOString() },
          timestamp: new Date().toISOString()
        };
        writer.write(encoder.encode(`data: ${JSON.stringify(deleteEvent)}\n\n`));
        clearInterval(interval);
        writer.close();
        return;
      }

      // Send heartbeat
      const heartbeat = {
        type: 'heartbeat',
        jobStatus: currentJob.status,
        timestamp: new Date().toISOString()
      };
      writer.write(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));

      // If job is completed or failed, close connection after a delay
      if (currentJob.status === 'completed' || currentJob.status === 'failed') {
        setTimeout(() => {
          clearInterval(interval);
          writer.close();
        }, 5000); // Keep connection open for 5 seconds after completion
      }
    } catch (error) {
      console.error('SSE error:', error);
      clearInterval(interval);
      writer.close();
    }
  }, 3000); // Send update every 3 seconds

  // Clean up on connection close
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}