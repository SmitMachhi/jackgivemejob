"use client";

import { useCallback } from "react";

import { useUploadProgress } from "./useUploadProgress";
import { useProcessingStatus } from "./useProcessingStatus";
import { useRealProcessing } from "./useRealProcessing";
import { useSimulatedProcessing } from "./useSimulatedProcessing";

export function useProcessingLogic() {
  const { uploadProgress, isUploading, resetProgress } = useUploadProgress();
  const { processingStatus, currentJobId, resetStatus } = useProcessingStatus();
  const { startRealProcessing } = useRealProcessing();
  const { simulateProcessing } = useSimulatedProcessing();

  const handleCancelUpload = useCallback(() => {
    resetProgress();
    resetStatus();
  }, [resetProgress, resetStatus]);

  const handleRenderSubtitles = useCallback(async (file?: File, targetLanguage?: string) => {
    if (file && targetLanguage) {
      await startRealProcessing(file, targetLanguage);
    } else {
      simulateProcessing();
    }
  }, [startRealProcessing, simulateProcessing]);

  const resetProcessing = useCallback(() => {
    resetProgress();
    resetStatus();
  }, [resetProgress, resetStatus]);

  return {
    uploadProgress,
    isUploading,
    processingStatus,
    currentJobId,
    handleCancelUpload,
    handleRenderSubtitles,
    resetProcessing
  };
}