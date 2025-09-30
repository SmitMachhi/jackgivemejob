"use client";

import { useMainContentHandlers } from "./MainContentSection/useMainContentHandlers";
import { MainContentLayout } from "./MainContentSection/MainContentLayout";

interface MainContentSectionProps {
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  setIsDragOver: (value: boolean) => void;
  uploadHandlers: Record<string, unknown>;
  uploadProgress: number | null;
  isUploading: boolean;
  processingStatus: string | null;
  handleRenderSubtitles: () => void;
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
  resetAll: () => void;
}

export function MainContentSection({
  selectedFile,
  videoUrl,
  selectedLanguage,
  setSelectedLanguage,
  setIsDragOver,
  uploadHandlers,
  uploadProgress,
  isUploading,
  processingStatus,
  handleRenderSubtitles,
  handleCancelUpload,
  handleUploadThingComplete,
  handleRetry,
  pendingFile,
  uploadState,
  resetAll,
}: MainContentSectionProps) {
  const handlers = useMainContentHandlers(
    uploadHandlers,
    setIsDragOver,
    handleRenderSubtitles
  );

  return (
    <MainContentLayout
      selectedFile={selectedFile}
      videoUrl={videoUrl}
      selectedLanguage={selectedLanguage}
      setSelectedLanguage={setSelectedLanguage}
      uploadHandlers={uploadHandlers}
      uploadProgress={uploadProgress}
      isUploading={isUploading}
      processingStatus={processingStatus}
      handleUploadThingComplete={handleUploadThingComplete}
      pendingFile={pendingFile}
      uploadState={uploadState}
      handleCancelUpload={handleCancelUpload}
      resetAll={resetAll}
      handlers={handlers}
    />
  );
}
