"use client";

import VideoPreview from "./VideoPreview";
import RenderButton from "./RenderButton";
import ExportControls from "./ExportControls";
import MakeAnotherButton from "./MakeAnotherButton";
import TimelinePanel from "./TimelinePanel";
import StepIndicators from "./StepIndicators";
import AgentInsightsPanel from "./AgentInsightsPanel";
import TranscriptSample from "./TranscriptSample";
import ChunkedGroups from "./ChunkedGroups";
import TranslationPreview from "./TranslationPreview";
import ValidationChecks from "./ValidationChecks";

interface VideoProcessingSectionProps {
  file: File;
  videoUrl: string;
  processingStatus: string | null;
  isUploading: boolean;
  uploadProgress: number | null;
  onRenderSubtitles: () => void;
  onReset: () => void;
}

export default function VideoProcessingSection({
  file,
  videoUrl,
  processingStatus,
  isUploading,
  uploadProgress,
  onRenderSubtitles,
  onReset
}: VideoProcessingSectionProps) {
  return (
    <div className="mt-8 space-y-6">
      <VideoPreview file={file} url={videoUrl} />
      <RenderButton
        onClick={onRenderSubtitles}
        processingStatus={processingStatus}
        isUploading={isUploading}
      />

      <StepIndicators
        processingStatus={processingStatus}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimelinePanel
          file={file}
          videoUrl={videoUrl}
          processingStatus={processingStatus}
        />
        <AgentInsightsPanel
          processingStatus={processingStatus}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TranscriptSample
          processingStatus={processingStatus}
        />
        <ChunkedGroups
          processingStatus={processingStatus}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TranslationPreview
          processingStatus={processingStatus}
        />
        <ValidationChecks
          processingStatus={processingStatus}
        />
      </div>

      <ExportControls
        file={file}
        videoUrl={videoUrl}
        processingStatus={processingStatus}
      />
      <MakeAnotherButton
        onReset={onReset}
        processingStatus={processingStatus}
      />
    </div>
  );
}