import { NextRequest, NextResponse } from 'next/server';
import { renderService } from '@/lib/services/render-service';

export async function GET() {
  try {
    // Get all jobs from the in-memory storage
    const allJobs = await renderService.getAllJobs();

    return NextResponse.json({
      totalJobs: allJobs.length,
      jobs: allJobs.map(job => ({
        id: job.id,
        status: job.status,
        phase: job.phase,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        input: {
          fileName: job.input?.data?.fileName || 'unknown',
          format: job.input?.format || 'unknown'
        },
        progress: {
          percentage: job.progress?.percentage || 0,
          message: job.progress?.message || 'No progress info'
        }
      })),
      memoryInfo: {
        jobKeys: Array.from((renderService as any).jobs?.keys() || []),
        hasJobs: (renderService as any).jobs?.size > 0
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Failed to get job information',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}