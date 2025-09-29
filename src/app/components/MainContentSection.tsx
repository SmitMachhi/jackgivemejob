"use client";

import ConstraintsBanner from "./components/ConstraintsBanner";
import UploadZone from "./components/UploadZone";
import VideoPreview from "./components/VideoPreview";
import RenderButton from "./components/RenderButton";
import ExportControls from "./components/ExportControls";
import MakeAnotherButton from "./components/MakeAnotherButton";
import StatusPill from "./components/StatusPill";
import { LanguageSelector } from "./components/LanguageSelector";

interface MainContentSectionProps {
  selectedFile: File | null;
  videoUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  setIsDragOver: (isDragOver: boolean) => void;
  uploadHandlers: any;
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
  resetAll
}: MainContentSectionProps) {
  function useMainContentHandlers(
    uploadHandlers: any,
    setIsDragOver: (isDragOver: boolean) => void,
    handleRenderSubtitles: () => void,
    selectedFile: File | null,
    selectedLanguage: string
  ) {
    const handleDragOver = (e: React.DragEvent) => {
      uploadHandlers.handleDragOver(e);
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      uploadHandlers.handleDragLeave(e);
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      uploadHandlers.handleDrop(e);
      setIsDragOver(false);
    };

    const handleRenderClick = () => {
      handleRenderSubtitles();
    };

    return {
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleRenderClick
    };
  }

  const handlers = useMainContentHandlers(
    uploadHandlers,
    setIsDragOver,
    handleRenderSubtitles,
    selectedFile,
    selectedLanguage
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ConstraintsBanner />
      <div className="flex gap-6 mb-6">
        <div className="flex-1">
          <UploadZone
            isDragOver={false}
            selectedFile={selectedFile}
            fileInputRef={uploadHandlers.fileInputRef}
            onDragOver={handlers.handleDragOver}
            onDragLeave={handlers.handleDragLeave}
            onDrop={handlers.handleDrop}
            onFileSelect={uploadHandlers.handleFileSelect}
            onClick={uploadHandlers.handleClickUpload}
            onDeleteFile={uploadHandlers.handleDeleteFile}
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

      {selectedFile && videoUrl && (
        <div className="space-y-6">
          <VideoPreview file={selectedFile} url={videoUrl} />

          <div className="flex items-center justify-between">
            {processingStatus && <StatusPill status={processingStatus} />}
            <RenderButton
              onClick={handlers.handleRenderClick}
              processingStatus={processingStatus}
              isUploading={isUploading}
              selectedLanguage={selectedLanguage}
            />
          </div>

          {processingStatus === "Done" && (
            <ExportControls
              file={selectedFile}
              videoUrl={videoUrl}
              processingStatus={processingStatus}
            />
          )}

          {processingStatus === "Done" && (
            <MakeAnotherButton
              onReset={resetAll}
              processingStatus={processingStatus}
            />
          )}
        </div>
      )}
    </div>
  );
}