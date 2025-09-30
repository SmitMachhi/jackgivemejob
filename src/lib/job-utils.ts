// Job utility functions for ID generation, IP extraction, and active job management

// In-memory store for tracking active jobs by IP
const activeJobsByIP = new Map<string, Set<string>>();
const MAX_JOBS_PER_IP = 1;
const MAX_TOTAL_JOBS = 3;

/**
 * Generate a unique job ID using timestamp and random characters
 * @returns A unique job ID string
 */
export function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `job_${timestamp}_${randomPart}`;
}

/**
 * Extract client IP from request headers
 * @param request - Next.js Request object
 * @returns Client IP address string
 */
export function getClientIP(request: Request): string {
  // Check for X-Forwarded-For header (can contain multiple IPs, first is the client)
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Check for X-Real-IP header
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }

  // Check for CF-Connecting-IP header (Cloudflare)
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Fallback to remote address (this may not be available in all environments)
  // In production, you might need to use the server's remote address
  return 'unknown';
}

/**
 * Add job to the active jobs tracking Map
 * @param jobId - Unique identifier for the job
 * @param ip - Client IP address
 */
export function addActiveJob(jobId: string, ip: string): void {
  // Get existing jobs for this IP or create new Set
  let ipJobs = activeJobsByIP.get(ip);
  if (!ipJobs) {
    ipJobs = new Set();
    activeJobsByIP.set(ip, ipJobs);
  }

  // Add the job to this IP's active jobs
  ipJobs.add(jobId);
}

/**
 * Remove job from the active jobs Map
 * @param jobId - Unique identifier for the job
 */
export function removeActiveJob(jobId: string): void {
  // Find and remove the job from all IP tracking
  for (const [ip, jobs] of activeJobsByIP.entries()) {
    if (jobs.has(jobId)) {
      jobs.delete(jobId);

      // Clean up empty Sets
      if (jobs.size === 0) {
        activeJobsByIP.delete(ip);
      }
      break;
    }
  }
}

/**
 * Check if IP is allowed to create a new job
 * @param ip - Client IP address
 * @returns Boolean indicating if the IP can create a new job
 */
export function isJobAllowed(ip: string): boolean {
  // Check total active jobs across all IPs
  let totalActiveJobs = 0;
  for (const jobs of activeJobsByIP.values()) {
    totalActiveJobs += jobs.size;
  }

  if (totalActiveJobs >= MAX_TOTAL_JOBS) {
    return false;
  }

  // Check active jobs for this specific IP
  const ipJobs = activeJobsByIP.get(ip);
  const ipJobCount = ipJobs ? ipJobs.size : 0;

  return ipJobCount < MAX_JOBS_PER_IP;
}

/**
 * Get the current count of active jobs for an IP
 * @param ip - Client IP address
 * @returns Number of active jobs for the IP
 */
export function getActiveJobCount(ip: string): number {
  const ipJobs = activeJobsByIP.get(ip);
  return ipJobs ? ipJobs.size : 0;
}

/**
 * Get the total count of active jobs across all IPs
 * @returns Total number of active jobs
 */
export function getTotalActiveJobCount(): number {
  let total = 0;
  for (const jobs of activeJobsByIP.values()) {
    total += jobs.size;
  }
  return total;
}

/**
 * Get all active job IDs for an IP
 * @param ip - Client IP address
 * @returns Array of active job IDs
 */
export function getActiveJobsForIP(ip: string): string[] {
  const ipJobs = activeJobsByIP.get(ip);
  return ipJobs ? Array.from(ipJobs) : [];
}

/**
 * Clean up all active jobs (useful for testing or server restart)
 */
export function clearAllActiveJobs(): void {
  activeJobsByIP.clear();
}