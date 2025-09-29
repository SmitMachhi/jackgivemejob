"use client";

import { useCallback, useState } from "react";

import { useDragState } from "./useDragState";
import { useVideoFile } from "./useVideoFile";
import { useLanguagePreference } from "./useLanguagePreference";

export interface UploadedFileData {
  key: string;
  size: number;
  mime: string;
  url: string;
  name: string;
}

export function useFileState() {
  const { isDragOver, setIsDragOver } = useDragState();
  const { selectedFile, videoUrl, handleFileSelected, handleFileDeleted, resetVideoFile } = useVideoFile();
  const { selectedLanguage, setSelectedLanguage } = useLanguagePreference();
  const [uploadedFileData, setUploadedFileData] = useState<UploadedFileData | null>(null);

  const handleUploadComplete = useCallback((fileData: UploadedFileData) => {
    setUploadedFileData(fileData);
  }, []);

  const handleUploadError = useCallback((error: Error) => {
    console.error("Upload error:", error);
  }, []);

  const resetAll = useCallback(() => {
    resetVideoFile();
    setIsDragOver(false);
    setUploadedFileData(null);
  }, [resetVideoFile, setIsDragOver]);

  return {
    isDragOver,
    selectedFile,
    videoUrl,
    selectedLanguage,
    setSelectedLanguage,
    setIsDragOver,
    handleFileSelected,
    handleFileDeleted,
    uploadedFileData,
    handleUploadComplete,
    handleUploadError,
    resetAll
  };
}