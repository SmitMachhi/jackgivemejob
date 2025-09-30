"use client";

import { useCallback, useState } from "react";

interface FileMetadata {
  key: string;
  size: number;
  mime: string;
  url: string;
  name: string;
}

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  fileMetadata: FileMetadata | null;
  error: string | null;
  retryCount: number;
  isRetrying: boolean;
}

export function useApiProcessing() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    fileMetadata: null,
    error: null,
    retryCount: 0,
    isRetrying: false,
  });

  const startRenderJob = useCallback(
    async (r2Key: string, targetLanguage: string, retryAttempt = 0): Promise<string> => {
      try {
        const response = await fetch("/api/jobs/render", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            r2Key,
            targetLang: targetLanguage,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start processing");
        }

        const result = await response.json();
        return result.jobId;
      } catch (error) {
        // Retry logic for network errors or server issues
        if (retryAttempt < 2) { // Max 3 attempts (0, 1, 2)
          setUploadState((prev) => ({
            ...prev,
            isRetrying: true,
            retryCount: retryAttempt + 1,
          }));

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryAttempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));

          setUploadState((prev) => ({
            ...prev,
            isRetrying: false,
          }));

          return startRenderJob(r2Key, targetLanguage, retryAttempt + 1);
        }
        throw error;
      }
    },
    [setUploadState]
  );

  const handleUploadComplete = useCallback(
    async (
      fileMetadata: FileMetadata,
      targetLanguage: string
    ): Promise<{ r2Key: string; jobId: string }> => {
      setUploadState((prev) => ({
        ...prev,
        isUploading: true,
        uploadProgress: 50,
        fileMetadata,
        error: null,
        retryCount: 0,
        isRetrying: false,
      }));

      try {
        // Extract R2 key from file metadata
        const r2Key = fileMetadata.key;

        // Start the render job with R2 key
        const jobId = await startRenderJob(r2Key, targetLanguage);

        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          uploadProgress: 100,
          retryCount: 0,
        }));

        return { r2Key, jobId };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start processing";
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [startRenderJob, setUploadState]
  );

  const startRealProcessing = useCallback(
    async (
      file: File,
      targetLanguage: string
    ): Promise<{ r2Key: string; jobId: string }> => {
      setUploadState((prev) => ({
        ...prev,
        isUploading: true,
        uploadProgress: 0,
        error: null,
      }));

      try {
        // For direct file upload (if you want to bypass the UploadThing UI component)
        // This would typically be done through the UploadThingUploadZone component's callback
        // But if you need programmatic upload, you can implement it here

        // For now, we'll use the existing UploadThingUploadZone component
        // The actual upload should be triggered through the component's onUploadComplete callback
        throw new Error(
          "Use UploadThingUploadZone component for file upload. Call handleUploadComplete with the file metadata."
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process file";
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [setUploadState]
  );

  const setFileMetadata = useCallback((fileMetadata: FileMetadata | null) => {
    setUploadState((prev) => ({
      ...prev,
      fileMetadata,
    }));
  }, []);

  const setUploading = useCallback((isUploading: boolean) => {
    setUploadState((prev) => ({
      ...prev,
      isUploading,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setUploadState((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      uploadProgress: 0,
      fileMetadata: null,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
  }, []);

  const retryUploadComplete = useCallback(async (
    fileMetadata: FileMetadata | null,
    targetLanguage: string
  ): Promise<{ r2Key: string; jobId: string }> => {
    if (!fileMetadata) {
      throw new Error("No file metadata available for retry");
    }

    setUploadState((prev) => ({
      ...prev,
      error: null,
      retryCount: 0,
      isRetrying: true,
    }));

    try {
      return await handleUploadComplete(fileMetadata, targetLanguage);
    } catch (error) {
      throw error;
    } finally {
      setUploadState((prev) => ({
        ...prev,
        isRetrying: false,
      }));
    }
  }, [handleUploadComplete]);

  return {
    startRealProcessing,
    handleUploadComplete,
    retryUploadComplete,
    uploadState,
    setFileMetadata,
    setUploading,
    setError,
    resetUploadState,
  };
}
