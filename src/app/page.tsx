"use client";

import { useCallback } from "react";
import { useFileState } from "./hooks/useFileState";
import { useUploadHandlers } from "./hooks/useUploadHandlers";
import { useProcessingLogic } from "./hooks/useProcessingLogic";
import { MainContent } from "./components/MainContent";

export default function Home() {
  const {
    isDragOver,
    selectedFile,
    videoUrl,
    selectedLanguage,
    setSelectedLanguage,
    setIsDragOver,
    handleFileSelected,
    handleFileDeleted,
    resetAll,
  } = useFileState();

  const {
    uploadProgress,
    isUploading,
    processingStatus,
    handleCancelUpload,
    handleRenderSubtitles,
    handleUploadComplete,
    handleRetry,
    pendingFile,
    uploadState
  } = useProcessingLogic();

  const uploadHandlers = useUploadHandlers({
    onFileSelected: handleFileSelected,
    onFileDeleted: () => {
      handleFileDeleted();
    },
  });

  // Handler for when user clicks render button
  const handleRenderClick = useCallback(async () => {
    if (selectedFile && selectedLanguage) {
      try {
        await handleRenderSubtitles(selectedFile, selectedLanguage);
      } catch (error) {
        console.error("Error rendering subtitles:", error);
      }
    }
  }, [selectedFile, selectedLanguage, handleRenderSubtitles]);

  // Handler for when UploadThing upload completes
  const handleUploadThingComplete = useCallback(async (fileData: {
    key: string;
    size: number;
    mime: string;
    url: string;
    name: string;
  }) => {
    try {
      await handleUploadComplete(fileData);
    } catch (error) {
      console.error("Error in upload completion:", error);
    }
  }, [handleUploadComplete]);

  return (
    <MainContent
      isDragOver={isDragOver}
      selectedFile={selectedFile}
      videoUrl={videoUrl}
      selectedLanguage={selectedLanguage}
      setSelectedLanguage={setSelectedLanguage}
      setIsDragOver={setIsDragOver}
      uploadHandlers={uploadHandlers}
      uploadProgress={uploadProgress}
      isUploading={isUploading}
      processingStatus={processingStatus}
      handleRenderSubtitles={handleRenderClick}
      handleCancelUpload={handleCancelUpload}
      handleUploadThingComplete={handleUploadThingComplete}
      handleRetry={handleRetry}
      pendingFile={pendingFile}
      uploadState={uploadState}
      resetAll={resetAll}
    />
  );
}