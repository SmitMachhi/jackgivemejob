/* eslint-disable no-unused-vars */
"use client";

import { useCallback } from "react";

export function useSimulationUpload() {
  const simulateUpload = useCallback(
    (
      setProgress: (progress: number) => void,
      setUploading: (uploading: boolean) => void,
      onUploadComplete: () => void
    ) => {
      setUploading(true);
      setProgress(0);

      let currentProgress = 0;
      const uploadInterval = setInterval(() => {
        currentProgress += 20;
        if (currentProgress >= 100) {
          clearInterval(uploadInterval);
          setUploading(false);
          setProgress(100);
          onUploadComplete();
        } else {
          setProgress(currentProgress);
        }
      }, 100);
    },
    []
  );

  return { simulateUpload };
}
