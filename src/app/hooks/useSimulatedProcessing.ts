"use client";

import { useCallback } from "react";

import { useUploadProgress } from "./useUploadProgress";
import { useProcessingStatus } from "./useProcessingStatus";
import { useSimulationStatus } from "./useSimulationStatus";
import { useSimulationUpload } from "./useSimulationUpload";

export function useSimulatedProcessing() {
  const { setProgress, setUploading } = useUploadProgress();
  const { setStatus } = useProcessingStatus();
  const { updateStatus } = useSimulationStatus();
  const { simulateUpload } = useSimulationUpload();

  const simulateProcessing = useCallback(() => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      const currentStatus = updateStatus(setStatus, currentIndex);

      if (currentStatus === 'Uploading') {
        simulateUpload(setProgress, setUploading, () => {
          currentIndex++;
        });
      } else if (currentStatus === 'Done') {
        clearInterval(interval);
      } else if (currentStatus) {
        setTimeout(() => {
          currentIndex++;
        }, 1500);
      }
    }, 500);
  }, [setStatus, setProgress, setUploading, updateStatus, simulateUpload]);

  return { simulateProcessing };
}