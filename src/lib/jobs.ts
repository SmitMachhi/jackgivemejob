// Job management utilities for tracking active jobs, status, and events

interface Job {
  id: string;
  ip: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  events: JobEvent[];
}

interface JobEvent {
  timestamp: Date;
  type: string;
  data: object;
}

// In-memory store for tracking active jobs
const activeJobs = new Map<string, Job>();
const MAX_CONCURRENT_JOBS_PER_IP = 3;

/**
 * Track an active job and enforce concurrency limits
 * @param jobId - Unique identifier for the job
 * @param ip - Client IP address for rate limiting
 * @throws Error if concurrent job limit is exceeded
 */
export function trackActiveJob(jobId: string, ip: string): void {
  // Count active jobs for this IP
  const ipJobCount = Array.from(activeJobs.values()).filter(
    job => job.ip === ip &&
           ['pending', 'processing'].includes(job.status)
  ).length;

  if (ipJobCount >= MAX_CONCURRENT_JOBS_PER_IP) {
    throw new Error(`Maximum concurrent jobs (${MAX_CONCURRENT_JOBS_PER_IP}) exceeded for IP: ${ip}`);
  }

  // Create and track the job
  const job: Job = {
    id: jobId,
    ip,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    events: []
  };

  activeJobs.set(jobId, job);
}

/**
 * Get the current status of a job
 * @param jobId - Unique identifier for the job
 * @returns Job status or null if job not found
 */
export function getJobStatus(jobId: string): Job['status'] | null {
  const job = activeJobs.get(jobId);
  return job ? job.status : null;
}

/**
 * Get the full job details including events
 * @param jobId - Unique identifier for the job
 * @returns Complete job object or null if job not found
 */
export function getJob(jobId: string): Job | null {
  return activeJobs.get(jobId) || null;
}

/**
 * Update the status of a job
 * @param jobId - Unique identifier for the job
 * @param status - New status for the job
 * @throws Error if job not found
 */
export function updateJobStatus(jobId: string, status: Job['status']): void {
  const job = activeJobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  job.status = status;
  job.updatedAt = new Date();
}

/**
 * Add an event to a job's event log
 * @param jobId - Unique identifier for the job
 * @param event - Event object to record
 * @throws Error if job not found
 */
export function addJobEvent(jobId: string, event: Omit<JobEvent, 'timestamp'>): void {
  const job = activeJobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const jobEvent: JobEvent = {
    ...event,
    timestamp: new Date()
  };

  job.events.push(jobEvent);
  job.updatedAt = new Date();
}

/**
 * Remove a job from tracking (cleanup)
 * @param jobId - Unique identifier for the job
 */
export function cleanupJob(jobId: string): void {
  activeJobs.delete(jobId);
}

/**
 * Get all active jobs for a specific IP
 * @param ip - Client IP address
 * @returns Array of active jobs for the IP
 */
export function getActiveJobsByIp(ip: string): Job[] {
  return Array.from(activeJobs.values()).filter(
    job => job.ip === ip && ['pending', 'processing'].includes(job.status)
  );
}

/**
 * Get statistics about active jobs
 * @returns Object containing job statistics
 */
export function getJobStats(): {
  totalActiveJobs: number;
  jobsByStatus: Record<Job['status'], number>;
  uniqueIps: number;
} {
  const jobs = Array.from(activeJobs.values());
  const jobsByStatus = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<Job['status'], number>);

  const uniqueIps = new Set(jobs.map(job => job.ip)).size;

  return {
    totalActiveJobs: jobs.filter(job => ['pending', 'processing'].includes(job.status)).length,
    jobsByStatus,
    uniqueIps
  };
}

/**
 * Cancel a job
 * @param jobId - Unique identifier for the job
 * @throws Error if job not found or job is already completed
 */
export function cancelJob(jobId: string): void {
  const job = activeJobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    throw new Error(`Cannot cancel job with status: ${job.status}`);
  }

  updateJobStatus(jobId, 'cancelled');
  addJobEvent(jobId, {
    type: 'cancelled',
    data: { reason: 'Job cancelled by user' }
  });
}