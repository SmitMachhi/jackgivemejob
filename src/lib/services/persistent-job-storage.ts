// Enhanced RenderService with persistent job storage using Vercel Blob
// This integrates with your existing Vercel Blob setup for job metadata

import { put, del, list } from '@vercel/blob';
import { RenderJob } from '@/lib/types/render-job';
import { promises as fs } from 'fs';
import path from 'path';

// Key structure for Blob storage
const JOB_KEYS = {
  job: (id: string) => `jobs/${id}.json`,
  jobsIndex: () => `jobs/index.json`,
  jobEvents: (id: string) => `jobs/${id}/events.json`,
};

export class PersistentJobStorage {
  private isStorageAvailable: boolean = true;
  private lastAvailabilityCheck: number = 0;
  private readonly AVAILABILITY_CACHE_TTL = 60000; // 1 minute
  private readonly LOCAL_STORAGE_DIR = path.join(process.cwd(), 'temp', 'jobs');

  // Check if blob storage is available
  private async isBlobStorageAvailable(): Promise<boolean> {
    const now = Date.now();

    // Cache the availability check to avoid频繁检测
    if (now - this.lastAvailabilityCheck < this.AVAILABILITY_CACHE_TTL) {
      return this.isStorageAvailable;
    }

    try {
      // Check if BLOB_READ_WRITE_TOKEN is available
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('BLOB_READ_WRITE_TOKEN not found, blob storage unavailable');
        this.isStorageAvailable = false;
        this.lastAvailabilityCheck = now;
        return false;
      }

      // Try to list blobs to test connectivity
      await list({ prefix: 'test', limit: 1 });
      this.isStorageAvailable = true;
      this.lastAvailabilityCheck = now;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isSuspended = errorMessage.includes('suspended') ||
                         errorMessage.includes('not available') ||
                         errorMessage.includes('unauthorized');

      if (isSuspended) {
        console.log('Blob storage is suspended, marking as unavailable');
      } else {
        console.error('Blob storage availability check failed:', error);
      }

      this.isStorageAvailable = false;
      this.lastAvailabilityCheck = now;
      return false;
    }
  }

  // Get a single job
  async getJob(id: string): Promise<RenderJob | null> {
    try {
      // Check if blob storage is available first
      if (!(await this.isBlobStorageAvailable())) {
        console.log('Blob storage unavailable, skipping persistent storage read');
        return null;
      }

      // Try to get the job file directly by pathname first
      const jobPathname = `jobs/${id}.json`;
      const { blobs } = await list({ prefix: jobPathname });
      const jobBlob = blobs.find(blob => blob.pathname === jobPathname);

      if (!jobBlob) {
        // If not found by exact pathname, try broader search for backward compatibility
        const { blobs: allBlobs } = await list({ prefix: `jobs/${id}` });
        const matchingBlob = allBlobs.find(blob => blob.pathname.includes(id) && blob.pathname.endsWith('.json'));

        if (!matchingBlob) {
          console.log(`[PersistentJobStorage] Job ${id} not found in blob storage`);
          return null;
        }

        // Fetch the job data from the matching blob
        const response = await fetch(matchingBlob.url);
        if (!response.ok) {
          console.log(`[PersistentJobStorage] Failed to fetch job ${id} from blob: ${response.status}`);
          return null;
        }

        const jobData = await response.json();
        console.log(`[PersistentJobStorage] Found job ${id} via broader search`);

        // Convert date strings back to Date objects
        return {
          ...jobData,
          createdAt: new Date(jobData.createdAt),
          updatedAt: new Date(jobData.updatedAt),
          startedAt: jobData.startedAt ? new Date(jobData.startedAt) : undefined,
          completedAt: jobData.completedAt ? new Date(jobData.completedAt) : undefined,
          timeoutAt: jobData.timeoutAt ? new Date(jobData.timeoutAt) : undefined,
        };
      }

      // Fetch the job data
      const response = await fetch(jobBlob.url);
      if (!response.ok) {
        console.log(`[PersistentJobStorage] Failed to fetch job ${id}: ${response.status}`);
        return null;
      }

      const jobData = await response.json();
      console.log(`[PersistentJobStorage] Successfully retrieved job ${id} from blob storage`);

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
      // Check if blob storage is available first
      if (!(await this.isBlobStorageAvailable())) {
        console.log(`[PersistentJobStorage] Blob storage unavailable, skipping save for job ${job.id}`);
        return; // Don't throw, just skip silently
      }

      const jobPath = JOB_KEYS.job(job.id);
      const jobBlob = new Blob([JSON.stringify(job, null, 2)], {
        type: 'application/json',
      });

      console.log(`[PersistentJobStorage] Saving job ${job.id} to blob storage at path: ${jobPath}`);

      const result = await put(jobPath, jobBlob, {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
      });

      console.log(`[PersistentJobStorage] Successfully saved job ${job.id} to blob storage:`, result.url);

      // Update jobs index
      await this.updateJobsIndex();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isSuspended = errorMessage.includes('suspended') ||
                         errorMessage.includes('not available') ||
                         errorMessage.includes('unauthorized');

      if (isSuspended) {
        console.log(`[PersistentJobStorage] Blob storage suspended, marking as unavailable for job ${job.id}`);
        this.isStorageAvailable = false;
        this.lastAvailabilityCheck = Date.now();
        return; // Don't throw for suspension errors
      }

      console.error(`[PersistentJobStorage] Error saving job ${job.id}:`, error);
      // For non-suspension errors, still don't throw - just log and continue
      // This ensures the application doesn't fail due to storage issues
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
          createdAt: job.createdAt instanceof Date && !isNaN(job.createdAt.getTime()) ? job.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: job.updatedAt instanceof Date && !isNaN(job.updatedAt.getTime()) ? job.updatedAt.toISOString() : new Date().toISOString(),
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

  // Local file system fallback methods
  private async getLocalStoragePath(id: string): Promise<string> {
    await fs.mkdir(this.LOCAL_STORAGE_DIR, { recursive: true });
    return path.join(this.LOCAL_STORAGE_DIR, `${id}.json`);
  }

  private async saveJobToLocalFile(job: RenderJob): Promise<void> {
    try {
      const filePath = await this.getLocalStoragePath(job.id);
      await fs.writeFile(filePath, JSON.stringify(job, null, 2));
      console.log(`[PersistentJobStorage] Job ${job.id} saved to local file: ${filePath}`);
    } catch (error) {
      console.error(`[PersistentJobStorage] Failed to save job ${job.id} to local file:`, error);
      // Don't throw for local file errors either
    }
  }

  private async getJobFromLocalFile(id: string): Promise<RenderJob | null> {
    try {
      const filePath = await this.getLocalStoragePath(id);
      const data = await fs.readFile(filePath, 'utf-8');
      const job = JSON.parse(data) as RenderJob;

      // Convert date strings back to Date objects
      return {
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
        startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        timeoutAt: job.timeoutAt ? new Date(job.timeoutAt) : undefined,
      };
    } catch (error) {
      // File not found or invalid JSON is not an error for fallback storage
      return null;
    }
  }

  // Enhanced saveJob with local fallback
  async saveJobWithFallback(job: RenderJob): Promise<void> {
    try {
      // Try blob storage first
      if (await this.isBlobStorageAvailable()) {
        await this.saveJob(job);
      } else {
        console.log(`[PersistentJobStorage] Blob unavailable, using local storage for job ${job.id}`);
        await this.saveJobToLocalFile(job);
      }
    } catch (error) {
      console.log(`[PersistentJobStorage] Blob storage failed, falling back to local for job ${job.id}:`, error);
      await this.saveJobToLocalFile(job);
    }
  }

  // Enhanced getJob with local fallback
  async getJobWithFallback(id: string): Promise<RenderJob | null> {
    // Try blob storage first
    const blobJob = await this.getJob(id);
    if (blobJob) {
      return blobJob;
    }

    // Fall back to local file storage
    console.log(`[PersistentJobStorage] Job ${id} not found in blob storage, trying local file`);
    return await this.getJobFromLocalFile(id);
  }

  // Clean up local storage
  async cleanupLocalStorage(): Promise<number> {
    try {
      if (!await fs.access(this.LOCAL_STORAGE_DIR).catch(() => false)) {
        return 0;
      }

      const files = await fs.readdir(this.LOCAL_STORAGE_DIR);
      let cleanupCount = 0;

      for (const file of files) {
        const filePath = path.join(this.LOCAL_STORAGE_DIR, file);
        const stats = await fs.stat(filePath);

        // Clean up files older than 7 days
        if (Date.now() - stats.mtime.getTime() > 7 * 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath);
          cleanupCount++;
        }
      }

      return cleanupCount;
    } catch (error) {
      console.error('Error cleaning up local storage:', error);
      return 0;
    }
  }
}