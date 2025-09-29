"use client";

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
  } = useProcessingLogic();

  const uploadHandlers = useUploadHandlers({
    onFileSelected: handleFileSelected,
    onFileDeleted: () => {
      handleFileDeleted();
    },
  });

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
      handleRenderSubtitles={handleRenderSubtitles}
      handleCancelUpload={handleCancelUpload}
      resetAll={resetAll}
    />
  );
}