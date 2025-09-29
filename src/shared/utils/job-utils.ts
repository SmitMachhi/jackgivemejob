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