import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import { put } from "@vercel/blob";

// Simple input schema for video processing
export const SimpleVideoProcessSchema = z.object({
  videoUrl: z.string().url("Must be a valid URL"),
  fileName: z.string().min(1, "File name is required"),
  targetLanguage: z.enum(["es", "fr", "hi", "vi"]).default("vi"),
  userId: z.string().optional(),
});

export type SimpleVideoProcessInput = z.infer<typeof SimpleVideoProcessSchema>;

// Simple output schema
export const SimpleVideoProcessOutputSchema = z.object({
  success: z.boolean(),
  videoUrl: z.string().url(),
  processedVideoUrl: z.string().url(),
  downloadUrl: z.string().url(),
  status: z.enum(["processing", "completed", "failed"]),
  message: z.string(),
  processingTime: z.number(),
  jobId: z.string(),
});

export type SimpleVideoProcessOutput = z.infer<typeof SimpleVideoProcessOutputSchema>;

/**
 * Simple Video Processing Workflow
 *
 * A clean, simple workflow that:
 * 1. Downloads video from blob storage
 * 2. Processes it (transcribe -> translate -> render)
 * 3. Uploads result back to blob storage
 * 4. Returns the processed video URL
 */
export const simpleVideoProcess = task({
  id: "simple-video-process",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: SimpleVideoProcessInput, { ctx }) => {
    const startTime = Date.now();
    const jobId = ctx.run.id;

    console.log("Starting simple video processing", {
      jobId,
      fileName: payload.fileName,
      targetLanguage: payload.targetLanguage,
    });

    try {
      // Step 1: Download the video from blob storage
      console.log("Downloading video from blob storage", { videoUrl: payload.videoUrl });

      const videoResponse = await fetch(payload.videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }

      const videoBlob = await videoResponse.blob();
      console.log("Video downloaded successfully", {
        size: videoBlob.size,
        type: videoBlob.type
      });

      // Step 2: Simulate processing (in real implementation, this would be your actual processing)
      console.log("Processing video", { targetLanguage: payload.targetLanguage });

      // Simulate transcription
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("Transcription completed");

      // Simulate translation
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Translation completed");

      // Simulate video rendering
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("Video rendering completed");

      // Step 3: Create processed video blob (in real implementation, this would be your processed video)
      const processedVideoBlob = new Blob(["processed video content"], {
        type: "video/mp4"
      });

      // Step 4: Upload processed video to blob storage
      const outputFileName = `processed_${payload.fileName}`;
      console.log("Uploading processed video to blob storage", { outputFileName });

      const blobResult = await put(outputFileName, processedVideoBlob, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: false,
      });

      console.log("Processed video uploaded successfully", {
        url: blobResult.url,
        downloadUrl: blobResult.downloadUrl
      });

      const processingTime = Date.now() - startTime;

      // Return successful result
      const result: SimpleVideoProcessOutput = {
        success: true,
        videoUrl: payload.videoUrl,
        processedVideoUrl: blobResult.url,
        downloadUrl: blobResult.downloadUrl,
        status: "completed",
        message: `Video processed successfully in ${processingTime}ms`,
        processingTime,
        jobId,
      };

      console.log("Video processing completed successfully", {
        jobId,
        processingTime,
        outputUrl: blobResult.url,
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Video processing failed", {
        jobId,
        error: error instanceof Error ? error.message : error,
        processingTime,
      });

      // Return failed result
      const result: SimpleVideoProcessOutput = {
        success: false,
        videoUrl: payload.videoUrl,
        processedVideoUrl: payload.videoUrl,
        downloadUrl: payload.videoUrl,
        status: "failed",
        message: `Processing failed: ${error instanceof Error ? error.message : error}`,
        processingTime,
        jobId,
      };

      return result;
    }
  },
});

// Simple status check task
export const simpleVideoStatus = task({
  id: "simple-video-status",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
  },
  run: async (payload: { jobId: string }, { ctx }) => {
    console.log("Checking video processing status", { jobId: payload.jobId });

    // In a real implementation, you would check the actual job status
    // For now, we'll just return a mock status
    return {
      jobId: payload.jobId,
      status: "completed",
      message: "Video processing completed",
      processedAt: new Date().toISOString(),
    };
  },
});