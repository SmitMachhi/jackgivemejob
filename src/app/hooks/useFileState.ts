"use client";

import { useCallback } from "react";

import { useDragState } from "./useDragState";
import { useVideoFile } from "./useVideoFile";
import { useLanguagePreference } from "./useLanguagePreference";

export function useFileState() {
  const { isDragOver, setIsDragOver } = useDragState();
  const { selectedFile, videoUrl, handleFileSelected, handleFileDeleted, resetVideoFile } = useVideoFile();
  const { selectedLanguage, setSelectedLanguage } = useLanguagePreference();

  const resetAll = useCallback(() => {    resetVideoFile();
    setIsDragOver(false);
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
    resetAll
  };
}