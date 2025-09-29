"use client";

import { useState, useCallback } from "react";

export function useVideoFile() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(URL.createObjectURL(file));
  }, [videoUrl]);

  const handleFileDeleted = useCallback(() => {
    setSelectedFile(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
  }, [videoUrl]);

  const resetVideoFile = useCallback(() => {
    setSelectedFile(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
  }, [videoUrl]);

  return {
    selectedFile,
    videoUrl,
    handleFileSelected,
    handleFileDeleted,
    resetVideoFile
  };
}