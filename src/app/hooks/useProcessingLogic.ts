"use client";

import { useCallback } from "react";

import { useUploadProgress } from "./useUploadProgress";
import { useProcessingStatus } from "./useProcessingStatus";
import { useRealProcessing } from "./useRealProcessing";
import { useSimulatedProcessing } from "./useSimulatedProcessing";

export function useProcessingLogic() {
  const { uploadProgress, isUploading, resetProgress } = useUploadProgress();
  const { processingStatus, currentJobId, resetStatus } = useProcessingStatus();
  const {
    startRealProcessing,
    continueProcessingAfterUpload,
    retryProcessing,
    pendingFile,
    resetProcessingState,
    uploadState
  } = useRealProcessing();
  const { simulateProcessing } = useSimulatedProcessing();

  const handleCancelUpload = useCallback(() => {
    resetProgress();
    resetStatus();
    resetProcessingState();
  }, [resetProgress, resetStatus, resetProcessingState]);

  const handleRenderSubtitles = useCallback(async (file?: File, targetLanguage?: string) => {
    if (file && targetLanguage) {
      try {
        await startRealProcessing(file, targetLanguage);
      } catch (error) {
        console.error("Error in handleRenderSubtitles:", error);
        // The error is already handled in startRealProcessing
      }
    } else {
      simulateProcessing();
    }
  }, [startRealProcessing, simulateProcessing]);

  const handleUploadComplete = useCallback(async (fileMetadata: {
    key: string;
    size: number;
    mime: string;
    url: string;
    name: string;
  }) => {
    if (pendingFile) {
      try {
        await continueProcessingAfterUpload(fileMetadata, pendingFile.targetLanguage);
      } catch (error) {
        console.error("Error after upload complete:", error);
        // The error is already handled in continueProcessingAfterUpload
      }
    }
  }, [pendingFile, continueProcessingAfterUpload]);

  const handleRetry = useCallback(async () => {
    try {
      await retryProcessing();
    } catch (error) {
      console.error("Retry failed:", error);
      // The error is already handled in retryProcessing
    }
  }, [retryProcessing]);

  const resetProcessing = useCallback(() => {
    resetProgress();
    resetStatus();
    resetProcessingState();
  }, [resetProgress, resetStatus, resetProcessingState]);

  return {
    uploadProgress,
    isUploading,
    processingStatus,
    currentJobId,
    handleCancelUpload,
    handleRenderSubtitles,
    handleUploadComplete,
    handleRetry,
    resetProcessing,
    pendingFile,
    uploadState
  };
}