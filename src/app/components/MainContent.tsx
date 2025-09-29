"use client";

import { MainContentSection } from "./MainContentSection";

interface MainContentProps {
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  setIsDragOver: (isDragOver: boolean) => void;
  uploadHandlers: {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleDragOver: () => void;
    handleDragLeave: () => void;
    handleDrop: () => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleClickUpload: () => void;
    handleDeleteFile: () => void;
  };
  uploadProgress: number | null;
  isUploading: boolean;
  processingStatus: string | null;
  handleRenderSubtitles: () => void;
  handleCancelUpload: () => void;
  resetAll: () => void;
}

export function MainContent(props: MainContentProps) {
  return <MainContentSection {...props} />;
}