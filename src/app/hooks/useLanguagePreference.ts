"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEYS = {
  SELECTED_LANGUAGE: 'selected-language'
};

const DEFAULT_LANGUAGE = 'vi';

export function useLanguagePreference() {
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(DEFAULT_LANGUAGE);

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

  return {
    selectedLanguage,
    setSelectedLanguage
  };
}