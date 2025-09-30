"use client";

import { useCallback, useState } from "react";

import { useUploadProgress } from "./useUploadProgress";
import { useProcessingStatus } from "./useProcessingStatus";
import { useApiProcessing } from "./useApiProcessing";
import { useStatusPolling } from "./useStatusPolling";

interface FileMetadata {
  key: string;
  size: number;
  mime: string;
  url: string;
  name: string;
}

export function useRealProcessing() {
  const { setProgress, setUploading, resetProgress } = useUploadProgress();
  const { setStatus, setJobId, setStatusInterval } = useProcessingStatus();
  const { handleUploadComplete, retryUploadComplete, uploadState } = useApiProcessing();
  const { startPolling } = useStatusPolling();

  const [pendingFile, setPendingFile] = useState<{ file: File; targetLanguage: string } | null>(null);

  const startRealProcessing = useCallback(
    async (file: File, targetLanguage: string) => {
      try {
        setStatus("Uploading");
        setUploading(true);
        setProgress(0);

        // Store the file and language for after upload completes
        setPendingFile({ file, targetLanguage });

        // The actual upload will be handled by UploadThingUploadZone component
        // This function now sets up the state for the upload process
        // The handleUploadComplete function will be called after upload finishes

        return {
          needsUploadThing: true,
          message: "Please use UploadThingUploadZone component to upload the file"
        };
      } catch (error) {
        console.error("Error starting processing:", error);
        setStatus(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        setUploading(false);
        resetProgress();
        setPendingFile(null);
        throw error;
      }
    },
    [setStatus, setUploading, setProgress, resetProgress]
  );

  const continueProcessingAfterUpload = useCallback(async (
    fileMetadata: FileMetadata,
    targetLanguage: string
  ) => {
    try {
      setStatus("Processing");
      setProgress(50);

      // Call handleUploadComplete which will handle the R2 key extraction and API call
      const { r2Key, jobId } = await handleUploadComplete(fileMetadata, targetLanguage);

      if (!jobId) {
        throw new Error("No job ID returned from server");
      }

      setJobId(jobId);
      setProgress(100);
      setUploading(false);
      setStatus("Queued");
      setPendingFile(null);

      // Start polling for job status
      startPolling(jobId, setStatus, setStatusInterval);

      return { r2Key, jobId };
    } catch (error) {
      console.error("Error processing after upload:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setUploading(false);
      resetProgress();
      setPendingFile(null);
      throw error;
    }
  }, [
    handleUploadComplete,
    setStatus,
    setJobId,
    setStatusInterval,
    setUploading,
    setProgress,
    resetProgress,
    startPolling,
  ]);

  const retryProcessing = useCallback(async () => {
    if (pendingFile && uploadState.fileMetadata) {
      try {
        await retryUploadComplete(uploadState.fileMetadata, pendingFile.targetLanguage);
      } catch (error) {
        console.error("Retry failed:", error);
        throw error;
      }
    } else {
      throw new Error("No pending file or metadata available for retry");
    }
  }, [pendingFile, uploadState.fileMetadata, retryUploadComplete]);

  const resetProcessingState = useCallback(() => {
    setPendingFile(null);
    resetProgress();
  }, [resetProgress]);

  return {
    startRealProcessing,
    continueProcessingAfterUpload,
    retryProcessing,
    pendingFile,
    resetProcessingState,
    uploadState
  };
}
