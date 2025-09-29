"use client";

import { useCallback } from "react";

export function useApiProcessing() {
  const uploadFile = useCallback(async (file: File, targetLanguage: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetLanguage', targetLanguage);

    const response = await fetch('/api/jobs/render', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start processing');
    }

    const result = await response.json();
    return result.jobId;
  }, []);

  return { uploadFile };
}