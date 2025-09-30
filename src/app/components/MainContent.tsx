"use client";

import { MainContentSection } from "./MainContentSection";

interface MainContentProps {
  isDragOver: boolean;
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  setIsDragOver: (value: boolean) => void;
  uploadHandlers: {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleFileSelect: (file: File) => void;
    handleClickUpload: () => void;
    handleDeleteFile: () => void;
  };
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

export function MainContent(props: MainContentProps) {
  return <MainContentSection {...props} />;
}