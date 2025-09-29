"use client";

import ConstraintsBanner from "../ConstraintsBanner";

import { UploadSection } from "./UploadSection";
import { ProcessingSection } from "./ProcessingSection";

interface MainContentLayoutProps {
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: () => void;
  uploadHandlers: Record<string, unknown>;
  uploadProgress: number | null;
  isUploading: boolean;
  processingStatus: string | null;
  handleCancelUpload: () => void;
  resetAll: () => void;
  handlers: {
    handleDragOver: () => void;
    handleDragLeave: () => void;
    handleDrop: () => void;
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
