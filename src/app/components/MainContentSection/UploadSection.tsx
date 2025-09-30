"use client";

import UploadZone from "../UploadZone";
import { LanguageSelector } from "../LanguageSelector";

interface UploadSectionProps {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  uploadHandlers: Record<string, unknown>;
  uploadProgress: number | null;
  isUploading: boolean;
  handleCancelUpload: () => void;
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
  handlers,
}: UploadSectionProps) {
  return (
    <div className="flex gap-6 mb-6">
      <div className="flex-1">
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
