export interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
  result?: unknown;
}

export function createJobStatus(
  id: string,
  status: JobStatus["status"] = "pending",
  progress: number = 0,
  message?: string
): JobStatus {
  return {
    id,
    status,
    progress,
    message,
  };
}

export function updateJobStatus(
  job: JobStatus,
  status: JobStatus["status"],
  progress?: number,
  message?: string,
  result?: unknown
): JobStatus {
  return {
    ...job,
    status,
    progress: progress ?? job.progress,
    message: message ?? job.message,
    result: result ?? job.result,
  };
}

export function isJobComplete(job: JobStatus): boolean {
  return job.status === "completed" || job.status === "failed";
}

export function getJobProgressColor(job: JobStatus): string {
  if (job.status === "completed") return "text-green-600";
  if (job.status === "failed") return "text-red-600";
  if (job.status === "processing") return "text-blue-600";
  return "text-gray-600";
}

// Utility functions for job management
export function getClientIP(request: Request): string {
  return (request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown').split(',')[0].trim();
}

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simple in-memory stores for active jobs
const activeJobs = new Map<string, { ip: string; timestamp: number }>();

export function addActiveJob(jobId: string, ip: string): void {
  activeJobs.set(jobId, { ip, timestamp: Date.now() });
}

export function removeActiveJob(jobId: string): void {
  activeJobs.delete(jobId);
}

export function checkConcurrencyLimits(ip: string): { valid: boolean; error?: string } {
  const MAX_CONCURRENT_JOBS = 3;
  const activeJobsByIp = Array.from(activeJobs.values()).filter(job => job.ip === ip);

  if (activeJobsByIp.length >= MAX_CONCURRENT_JOBS) {
    return { valid: false, error: `Maximum ${MAX_CONCURRENT_JOBS} concurrent jobs allowed per IP` };
  }

  return { valid: true };
}

export function getActiveJobsDebug(): Array<{ jobId: string; ip: string; timestamp: number }> {
  return Array.from(activeJobs.entries()).map(([jobId, job]) => ({
    jobId,
    ip: job.ip,
    timestamp: job.timestamp
  }));
}