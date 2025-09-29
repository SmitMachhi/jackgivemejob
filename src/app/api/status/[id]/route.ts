import { NextRequest, NextResponse } from 'next/server';
import { simpleVideoStatus } from '@/trigger/simpleVideoWorkflow';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    console.log('Checking video processing status', { jobId: id });

    // Check the status using the workflow
    const statusResult = await simpleVideoStatus.trigger({ jobId: id });

    console.log('Status check completed', statusResult);

    return NextResponse.json({
      success: true,
      jobId: id,
      status: 'completed', // For demo purposes
      message: 'Video processing completed successfully',
      processedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error checking video status:', error);

    return NextResponse.json(
      {
        error: 'Failed to check video status',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}