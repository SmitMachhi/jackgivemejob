"use client";

import { useCallback, useState, useEffect } from "react";

const STORAGE_KEYS = {
  SELECTED_LANGUAGE: 'selected-language'
};

const DEFAULT_LANGUAGE = 'vi';

export function useFileState() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Initialize language from localStorage
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(STORAGE_KEYS.SELECTED_LANGUAGE);
      if (savedLanguage && typeof savedLanguage === 'string') {
        setSelectedLanguageState(savedLanguage);
      }
    } catch (error) {
      console.warn('Failed to load language preference from localStorage:', error);
    }
  }, []);

  // Save language preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_LANGUAGE, selectedLanguage);
    } catch (error) {
      console.warn('Failed to save language preference to localStorage:', error);
    }
  }, [selectedLanguage]);

  const setSelectedLanguage = useCallback((language: string) => {
    setSelectedLanguageState(language);
  }, []);

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
    selectedLanguage,
    setSelectedLanguage,
    setIsDragOver,
    handleFileSelected,
    handleFileDeleted,
    resetAll
  };
}