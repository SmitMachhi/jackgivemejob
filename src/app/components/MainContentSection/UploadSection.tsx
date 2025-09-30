"use client";

import { useState, useEffect, useCallback } from "react";
import UploadZone from "../UploadZone";
import { LanguageSelector } from "../LanguageSelector";
import { UploadThingUploadZone } from "../UploadThingUploadZone";
import { ProcessingErrorHandler } from "../ErrorHandling/ProcessingErrorHandler";
import { ProcessingLoadingStates } from "../LoadingStates/ProcessingLoadingStates";

interface UploadSectionProps {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  uploadHandlers: Record<string, unknown>;
  uploadProgress: number | null;
  isUploading: boolean;
  handleCancelUpload: () => void;
  handleUploadThingComplete: (fileData: {
    key: string;
    size: number;
    mime: string;
    url: string;
    name: string;
  }) => void;
  handleRetry: () => void;
  pendingFile: { file: File; targetLanguage: string } | null;
  uploadState: {
    isUploading: boolean;
    uploadProgress: number;
    fileMetadata: {
      key: string;
      size: number;
      mime: string;
      url: string;
      name: string;
    } | null;
    error: string | null;
    retryCount: number;
    isRetrying: boolean;
  };
  handlers: {
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
  };
}

export function UploadSection({
  selectedLanguage,
  setSelectedLanguage,
  uploadHandlers,
  uploadProgress,
  isUploading,
  handleCancelUpload,
  handleUploadThingComplete,
  handleRetry,
  pendingFile,
  uploadState,
  handlers,
}: UploadSectionProps) {
  const [useUploadThing, setUseUploadThing] = useState(false);
  const [errorState, setErrorState] = useState<{
    error: string | null;
    isRetrying: boolean;
    retryCount: number;
  }>({
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  // Show UploadThing component when we have a pending file
  useEffect(() => {
    if (pendingFile) {
      setUseUploadThing(true);
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
      });
    }
  }, [pendingFile]);

  // Sync with uploadState
  useEffect(() => {
    if (uploadState.error) {
      setErrorState({
        error: uploadState.error,
        isRetrying: uploadState.isRetrying,
        retryCount: uploadState.retryCount,
      });
    }
  }, [uploadState.error, uploadState.isRetrying, uploadState.retryCount]);

  const handleUploadThingError = useCallback((error: Error) => {
    console.error("UploadThing error:", error);
    setErrorState({
      error: error.message,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  const handleRetryClick = useCallback(async () => {
    if (pendingFile && uploadState.fileMetadata) {
      try {
        setErrorState(prev => ({
          ...prev,
          error: null,
          isRetrying: true,
        }));

        await handleRetry();

        setErrorState(prev => ({
          ...prev,
          isRetrying: false,
        }));
      } catch (error) {
        console.error("Retry failed:", error);
        setErrorState(prev => ({
          ...prev,
          isRetrying: false,
          error: error instanceof Error ? error.message : "Retry failed",
        }));
      }
    }
  }, [pendingFile, uploadState.fileMetadata, handleRetry]);

  const handleReupload = useCallback(() => {
    setUseUploadThing(false);
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  const handleReset = useCallback(() => {
    setUseUploadThing(false);
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
    // Clear any pending file state
    if (uploadHandlers.handleDeleteFile) {
      (uploadHandlers.handleDeleteFile as () => void)();
    }
  }, [uploadHandlers]);

  const getProcessingStage = (): "upload" | "api" | "complete" => {
    if (uploadState.uploadProgress < 50) return "upload";
    if (uploadState.uploadProgress < 100) return "api";
    return "complete";
  };

  return (
    <div className="flex gap-6 mb-6">
      <div className="flex-1">
        {/* Error Handler */}
        {errorState.error && (
          <ProcessingErrorHandler
            error={errorState.error}
            isRetrying={errorState.isRetrying}
            retryCount={errorState.retryCount}
            onRetry={handleRetryClick}
            onReset={handleReset}
            onReupload={handleReupload}
            className="mb-4"
          />
        )}

        {/* Loading States */}
        {uploadState.isUploading && (
          <ProcessingLoadingStates
            isUploading={uploadState.isUploading}
            uploadProgress={uploadState.uploadProgress}
            isRetrying={uploadState.isRetrying}
            retryCount={uploadState.retryCount}
            stage={getProcessingStage()}
            className="mb-4"
          />
        )}

        {/* Upload Zone */}
        {useUploadThing ? (
          <UploadThingUploadZone
            onUploadComplete={handleUploadThingComplete}
            onUploadError={handleUploadThingError}
          />
        ) : (
          <UploadZone
            isDragOver={false}
            selectedFile={uploadHandlers.selectedFile as File | null}
            fileInputRef={
              uploadHandlers.fileInputRef as React.RefObject<HTMLInputElement | null>
            }
            onDragOver={handlers.handleDragOver}
            onDragLeave={handlers.handleDragLeave}
            onDrop={handlers.handleDrop}
            onFileSelect={uploadHandlers.handleFileSelect as (file: File) => void}
            onClick={uploadHandlers.handleClickUpload as () => void}
            onDeleteFile={uploadHandlers.handleDeleteFile as () => void}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
            onCancelUpload={handleCancelUpload}
          />
        )}
      </div>
      <div className="w-48">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          className="w-full"
        />
      </div>
    </div>
  );
}
