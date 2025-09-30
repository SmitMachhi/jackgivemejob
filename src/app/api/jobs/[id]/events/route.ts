import { NextRequest, NextResponse } from 'next/server';

// Define event schema type
interface JobEvent {
  id: string;
  type: string;
  timestamp: Date;
  data?: Record<string, any>;
}

// Simple in-memory events store (for now)
const jobEventsStore = new Map<string, JobEvent[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Initialize empty events array for this job if it doesn't exist
    if (!jobEventsStore.has(jobId)) {
      jobEventsStore.set(jobId, []);
    }

    const events = jobEventsStore.get(jobId) || [];

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching job events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job events' },
      { status: 500 }
    );
  }
}