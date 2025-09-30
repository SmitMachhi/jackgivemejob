import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory job status store (for now)
const jobStatusStore = new Map<string, {
  status: 'queued' | 'running' | 'failed' | 'done';
  outputUrl?: string;
  reason?: string;
  createdAt: Date;
}>();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // For now, return a placeholder status since we haven't connected Trigger.dev yet
    const placeholderStatus = {
      status: 'queued' as const,
      createdAt: new Date(),
    };

    // Store the placeholder status
    if (!jobStatusStore.has(jobId)) {
      jobStatusStore.set(jobId, placeholderStatus);
    }

    const jobStatus = jobStatusStore.get(jobId);

    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(jobStatus);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}