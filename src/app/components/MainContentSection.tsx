"use client";

import { useMainContentHandlers } from "./MainContentSection/useMainContentHandlers";
import { MainContentLayout } from "./MainContentSection/MainContentLayout";

interface MainContentSectionProps {
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: () => void;
  setIsDragOver: () => void;
  uploadHandlers: Record<string, unknown>;
  uploadProgress: number | null;
  isUploading: boolean;
  processingStatus: string | null;
  handleRenderSubtitles: () => void;
  handleCancelUpload: () => void;
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
      handleCancelUpload={handleCancelUpload}
      resetAll={resetAll}
      handlers={handlers}
    />
  );
}
