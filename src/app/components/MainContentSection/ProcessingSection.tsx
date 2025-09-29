"use client";

import VideoPreview from "../VideoPreview";
import RenderButton from "../RenderButton";
import ExportControls from "../ExportControls";
import MakeAnotherButton from "../MakeAnotherButton";
import StatusPill from "../StatusPill";

interface ProcessingSectionProps {
  selectedFile: File | null;
  videoUrl: string | null;
  processingStatus: string | null;
  isUploading: boolean;
  selectedLanguage: string;
  handleRenderClick: () => void;
  resetAll: () => void;
}

export function ProcessingSection({
  selectedFile,
  videoUrl,
  processingStatus,
  isUploading,
  selectedLanguage,
  handleRenderClick,
  resetAll,
}: ProcessingSectionProps) {
  return (
    <div className="space-y-6">
      <VideoPreview file={selectedFile!} url={videoUrl!} />

      <div className="flex items-center justify-between">
        {processingStatus && <StatusPill status={processingStatus} />}
        <RenderButton
          onClick={handleRenderClick}
          processingStatus={processingStatus}
          isUploading={isUploading}
          selectedLanguage={selectedLanguage}
        />
      </div>

      {processingStatus === "Done" && (
        <ExportControls
          file={selectedFile!}
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
  );
}
