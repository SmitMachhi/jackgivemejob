"use client";

import { useCallback, useState } from "react";

export function useUploadProgress() {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const setProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
  }, []);

  const setUploading = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
  }, []);

  const resetProgress = useCallback(() => {
    setUploadProgress(null);
    setIsUploading(false);
  }, []);

  return {
    uploadProgress,
    isUploading,
    setProgress,
    setUploading,
    resetProgress
  };
}