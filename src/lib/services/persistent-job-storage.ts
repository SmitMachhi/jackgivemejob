// Enhanced RenderService with persistent job storage using Vercel Blob
// This integrates with your existing Vercel Blob setup for job metadata

import { put, del, list } from '@vercel/blob';
import { RenderJob } from '@/lib/types/render-job';

// Key structure for Blob storage
const JOB_KEYS = {
  job: (id: string) => `jobs/${id}.json`,
  jobsIndex: () => `jobs/index.json`,
  jobEvents: (id: string) => `jobs/${id}/events.json`,
};

export class PersistentJobStorage {
  // Get a single job
  async getJob(id: string): Promise<RenderJob | null> {
    try {
      // Check if BLOB_READ_WRITE_TOKEN is available
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('BLOB_READ_WRITE_TOKEN not found, skipping persistent storage');
        return null;
      }

      // List blobs to find the job file
      const { blobs } = await list({ prefix: `jobs/${id}.json` });
      const jobBlob = blobs.find(blob => blob.pathname === `jobs/${id}.json`);

      if (!jobBlob) {
        return null;
      }

      // Fetch the job data
      const response = await fetch(jobBlob.url);
      if (!response.ok) {
        return null;
      }

      const jobData = await response.json();

      // Convert date strings back to Date objects
      return {
        ...jobData,
        createdAt: new Date(jobData.createdAt),
        updatedAt: new Date(jobData.updatedAt),
        startedAt: jobData.startedAt ? new Date(jobData.startedAt) : undefined,
        completedAt: jobData.completedAt ? new Date(jobData.completedAt) : undefined,
        timeoutAt: jobData.timeoutAt ? new Date(jobData.timeoutAt) : undefined,
      };
    } catch (error) {
      console.error('Error getting job:', error);
      return null;
    }
  }

  // Save a job
  async saveJob(job: RenderJob): Promise<void> {
    try {
      // Check if BLOB_READ_WRITE_TOKEN is available
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('BLOB_READ_WRITE_TOKEN not found, skipping persistent storage');
        return;
      }

      const jobBlob = new Blob([JSON.stringify(job, null, 2)], {
        type: 'application/json',
      });

      await put(JOB_KEYS.job(job.id), jobBlob, {
        access: 'public',
        contentType: 'application/json',
      });

      // Update jobs index
      await this.updateJobsIndex();
    } catch (error) {
      console.error('Error saving job:', error);
    }
  }

  // Get all jobs
  async getAllJobs(): Promise<RenderJob[]> {
    try {
      // Check if BLOB_READ_WRITE_TOKEN is available
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('BLOB_READ_WRITE_TOKEN not found, skipping persistent storage');
        return [];
      }

      const { blobs } = await list({ prefix: 'jobs/' });
      const jobBlobs = blobs.filter(blob =>
        blob.pathname.endsWith('.json') &&
        !blob.pathname.includes('/events/')
      );

      const jobs = await Promise.all(
        jobBlobs.map(async (blob) => {
          const jobId = blob.pathname.replace('jobs/', '').replace('.json', '');
          return this.getJob(jobId);
        })
      );

      return jobs.filter((job): job is RenderJob => job !== null);
    } catch (error) {
      console.error('Error getting all jobs:', error);
      return [];
    }
  }

  // Delete a job
  async deleteJob(id: string): Promise<boolean> {
    try {
      const job = await this.getJob(id);
      if (!job) return false;

      // Delete job file
      await del(JOB_KEYS.job(id));

      // Delete events file if it exists
      try {
        await del(JOB_KEYS.jobEvents(id));
      } catch (error) {
        // Events file might not exist, that's okay
      }

      // Update jobs index
      await this.updateJobsIndex();

      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      return false;
    }
  }

  // Get jobs by status
  async getJobsByStatus(status: string): Promise<RenderJob[]> {
    try {
      const allJobs = await this.getAllJobs();
      return allJobs.filter(job => job.status === status);
    } catch (error) {
      console.error('Error getting jobs by status:', error);
      return [];
    }
  }

  // Update jobs index for faster listing
  private async updateJobsIndex(): Promise<void> {
    try {
      // Check if BLOB_READ_WRITE_TOKEN is available
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('BLOB_READ_WRITE_TOKEN not found, skipping persistent storage');
        return;
      }

      const jobs = await this.getAllJobs();
      const indexData = {
        jobs: jobs.map(job => ({
          id: job.id,
          status: job.status,
          phase: job.phase,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        })),
        totalJobs: jobs.length,
        lastUpdated: new Date().toISOString(),
      };

      const indexBlob = new Blob([JSON.stringify(indexData, null, 2)], {
        type: 'application/json',
      });

      await put(JOB_KEYS.jobsIndex(), indexBlob, {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
      });
    } catch (error) {
      console.error('Error updating jobs index:', error);
    }
  }

  // Clean up old jobs (optional)
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const allJobs = await this.getAllJobs();
      const oldJobs = allJobs.filter(job => new Date(job.createdAt) < cutoffDate);

      let cleanupCount = 0;
      for (const job of oldJobs) {
        if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
          await this.deleteJob(job.id);
          cleanupCount++;
        }
      }

      return cleanupCount;
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }
}