"use client";

import ConstraintsBanner from "../ConstraintsBanner";

import { UploadSection } from "./UploadSection";
import { ProcessingSection } from "./ProcessingSection";

interface MainContentLayoutProps {
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  uploadHandlers: Record<string, unknown>;
  uploadProgress: number | null;
  isUploading: boolean;
  processingStatus: string | null;
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
  handlers: {
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleRenderClick: () => void;
  };
}

export function MainContentLayout({
  selectedFile,
  videoUrl,
  selectedLanguage,
  setSelectedLanguage,
  uploadHandlers,
  uploadProgress,
  isUploading,
  processingStatus,
  handleCancelUpload,
  handleUploadThingComplete,
  handleRetry,
  pendingFile,
  uploadState,
  resetAll,
  handlers,
}: MainContentLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ConstraintsBanner />

      <UploadSection
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        uploadHandlers={uploadHandlers}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        handleCancelUpload={handleCancelUpload}
        handleUploadThingComplete={handleUploadThingComplete}
        handleRetry={handleRetry}
        pendingFile={pendingFile}
        uploadState={uploadState}
        handlers={handlers}
      />

      {selectedFile && videoUrl && (
        <ProcessingSection
          selectedFile={selectedFile}
          videoUrl={videoUrl}
          processingStatus={processingStatus}
          isUploading={isUploading}
          selectedLanguage={selectedLanguage}
          handleRenderClick={handlers.handleRenderClick}
          resetAll={resetAll}
        />
      )}
    </div>
  );
}
