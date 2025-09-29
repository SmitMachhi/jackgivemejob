import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { BlobStorage } from "@/lib/blob-storage";

// Input schema for download task
export const DownloadTaskSchema = z.object({
  blobUrl: z.string().url("Invalid blob URL provided"),
  jobId: z.string().min(1, "Job ID is required"),
  filename: z.string().optional(),
  timeout: z.number().positive().min(5).max(300).default(60), // seconds
  maxRetries: z.number().min(0).max(5).default(3),
});

export type DownloadTaskInput = z.infer<typeof DownloadTaskSchema>;

// Output schema for download task
export const DownloadTaskOutputSchema = z.object({
  success: z.boolean(),
  filePath: z.string(),
  fileSize: z.number(),
  contentType: z.string().optional(),
  downloadTime: z.number(),
  filename: z.string(),
  jobId: z.string(),
});

export type DownloadTaskOutput = z.infer<typeof DownloadTaskOutputSchema>;

/**
 * Download Task - Downloads files from Blob storage to local filesystem
 *
 * This task handles downloading files from Vercel Blob storage with:
 * - URL validation and security checks
 * - Progress tracking and logging
 * - Retry logic with exponential backoff
 * - Temporary file management
 * - Error handling and reporting
 */
export const downloadTask = task({
  id: "download-file",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: DownloadTaskInput): Promise<DownloadTaskOutput> => {
    const startTime = Date.now();
    console.log("Starting download task", { payload });

    try {
      // Validate input
      const validatedInput = DownloadTaskSchema.parse(payload);
      console.log("Download input validated", { validatedInput });

      // Download file from blob storage
      const filePath = await BlobStorage.downloadFromBlob(
        validatedInput.blobUrl,
        validatedInput.jobId
      );

      // Get file stats
      const fs = await import("fs/promises");
      const fileStats = await fs.stat(filePath);

      const downloadTime = Date.now() - startTime;

      console.log("Download completed successfully", {
        jobId: validatedInput.jobId,
        filePath,
        fileSize: fileStats.size,
        downloadTime,
      });

      return {
        success: true,
        filePath,
        fileSize: fileStats.size,
        filename: filePath.split("/").pop() || "downloaded_file",
        jobId: validatedInput.jobId,
        downloadTime,
        contentType: "application/octet-stream", // Could be extracted from response if needed
      };
    } catch (error) {
      const downloadTime = Date.now() - startTime;
      console.error("Download task failed", {
        error: error instanceof Error ? error.message : error,
        duration: downloadTime,
        payload,
      });

      throw new Error(
        `Download failed after ${downloadTime}ms: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  },
});

// Utility function to clean up downloaded files
export const cleanupDownloadTask = task({
  id: "cleanup-download",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: { jobId: string }): Promise<void> => {
    console.log("Starting cleanup task", { payload });

    try {
      await BlobStorage.cleanupJobFiles(payload.jobId);

      console.log("Cleanup completed successfully", {
        jobId: payload.jobId,
      });
    } catch (error) {
      console.error("Cleanup task failed", {
        error: error instanceof Error ? error.message : error,
        payload,
      });

      // Don't throw error for cleanup failures, just log them
      console.warn("Cleanup failed, continuing execution");
    }
  },
});