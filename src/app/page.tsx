"use client";

import { useState } from "react";
import ConstraintsBanner from "./components/ConstraintsBanner";
import UploadZone from "./components/UploadZone";
import PageHeader from "./components/PageHeader";
import VideoProcessingSection from "./components/VideoProcessingSection";
import EventLogDrawer from "./components/EventLogDrawer";
import EventLogToggle from "./components/EventLogToggle";
import { useFileState } from "./hooks/useFileState";
import { useUploadHandlers } from "./hooks/useUploadHandlers";
import { useProcessingLogic } from "./hooks/useProcessingLogic";

export default function Home() {
  const {
    isDragOver,
    selectedFile,
    videoUrl,
    setIsDragOver,
    handleFileSelected,
    handleFileDeleted,
    resetAll
  } = useFileState();

  const {
    uploadProgress,
    isUploading,
    processingStatus,
    handleCancelUpload,
    handleRenderSubtitles,
    resetProcessing
  } = useProcessingLogic();

  const [isEventLogOpen, setIsEventLogOpen] = useState(false);

  const uploadHandlers = useUploadHandlers({
    onFileSelected: handleFileSelected,
    onFileDeleted: () => {
      handleFileDeleted();
      resetProcessing();
    }
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHeader />
      <ConstraintsBanner />
      <UploadZone
        isDragOver={isDragOver}
        selectedFile={selectedFile}
        fileInputRef={uploadHandlers.fileInputRef}
        onDragOver={(e) => {
          uploadHandlers.handleDragOver(e);
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          uploadHandlers.handleDragLeave(e);
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          uploadHandlers.handleDrop(e);
          setIsDragOver(false);
        }}
        onFileSelect={uploadHandlers.handleFileSelect}
        onClick={uploadHandlers.handleClickUpload}
        onDeleteFile={uploadHandlers.handleDeleteFile}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        onCancelUpload={handleCancelUpload}
      />

      {selectedFile && videoUrl && (
        <VideoProcessingSection
          file={selectedFile}
          videoUrl={videoUrl}
          processingStatus={processingStatus}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onRenderSubtitles={handleRenderSubtitles}
          onReset={resetAll}
        />
      )}

      {/* Event Log Toggle Button */}
      <EventLogToggle
        processingStatus={processingStatus}
        onToggle={() => setIsEventLogOpen(!isEventLogOpen)}
        eventCount={processingStatus === 'Done' ? 16 : undefined}
        hasWarnings={processingStatus === 'Done'}
        hasErrors={false}
      />

      {/* Event Log Drawer */}
      <EventLogDrawer
        processingStatus={processingStatus}
        isOpen={isEventLogOpen}
        onClose={() => setIsEventLogOpen(false)}
      />
    </div>
  );
}