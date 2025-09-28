"use client";

import { useCallback, useState } from "react";

export function useFileState() {
  const [isDragOver, setIsDragOver] = useState(false);
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

  const resetAll = useCallback(() => {
    setSelectedFile(null);
    setIsDragOver(false);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
  }, [videoUrl]);

  return {
    isDragOver,
    selectedFile,
    videoUrl,
    setIsDragOver,
    handleFileSelected,
    handleFileDeleted,
    resetAll
  };
}