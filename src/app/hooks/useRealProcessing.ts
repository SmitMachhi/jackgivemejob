"use client";

import { useCallback } from "react";

import { useUploadProgress } from "./useUploadProgress";
import { useProcessingStatus } from "./useProcessingStatus";
import { useApiProcessing } from "./useApiProcessing";
import { useStatusPolling } from "./useStatusPolling";

export function useRealProcessing() {
  const { setProgress, setUploading, resetProgress } = useUploadProgress();
  const { setStatus, setJobId, setStatusInterval } = useProcessingStatus();
  const { uploadFile } = useApiProcessing();
  const { startPolling } = useStatusPolling();

  const startRealProcessing = useCallback(
    async (file: File, targetLanguage: string) => {
      try {
        setStatus("Uploading");
        setUploading(true);
        setProgress(0);

        const jobId = await uploadFile(file, targetLanguage);

        if (!jobId) {
          throw new Error("No job ID returned from server");
        }

        setJobId(jobId);
        setProgress(100);
        setUploading(false);
        setStatus("Queued");

        startPolling(jobId, setStatus, setStatusInterval);
      } catch (error) {
        console.error("Error starting processing:", error);
        setStatus(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        setUploading(false);
        resetProgress();
      }
    },
    [
      setStatus,
      setUploading,
      setProgress,
      setJobId,
      setStatusInterval,
      uploadFile,
      startPolling,
      resetProgress,
    ]
  );

  return { startRealProcessing };
}
