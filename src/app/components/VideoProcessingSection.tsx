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

// Language-specific status messages
const STATUS_MESSAGES = {
  vi: {
    'Queued': 'Đang xếp hàng',
    'Uploading': 'Đang tải lên',
    'Transcribing': 'Đang chuyển giọng nói thành văn bản',
    'Translating': 'Đang dịch thuật',
    'Validating': 'Đang xác thực',
    'Rendering': 'Đang tạo phụ đề',
    'Done': 'Hoàn thành',
    'Error': 'Lỗi',
    'Processing': 'Đang xử lý'
  },
  hi: {
    'Queued': 'कतार में',
    'Uploading': 'अपलोड हो रहा है',
    'Transcribing': 'भाषण-से-पाठ परिवर्तन',
    'Translating': 'अनुवाद',
    'Validating': 'सत्यापन',
    'Rendering': 'कैप्शन निर्माण',
    'Done': 'पूर्ण',
    'Error': 'त्रुटि',
    'Processing': 'प्रसंस्करण'
  },
  fr: {
    'Queued': 'En attente',
    'Uploading': 'Téléchargement',
    'Transcribing': 'Transcription',
    'Translating': 'Traduction',
    'Validating': 'Validation',
    'Rendering': 'Rendu des sous-titres',
    'Done': 'Terminé',
    'Error': 'Erreur',
    'Processing': 'Traitement'
  },
  es: {
    'Queued': 'En cola',
    'Uploading': 'Subiendo',
    'Transcribing': 'Transcribiendo',
    'Translating': 'Traduciendo',
    'Validating': 'Validando',
    'Rendering': 'Generando subtítulos',
    'Done': 'Completado',
    'Error': 'Error',
    'Processing': 'Procesando'
  }
};

function getStatusMessage(status: string | null, language: string): string | null {
  if (!status) return null;

  const normalizedStatus = status.replace('Error: ', '');
  const messages = STATUS_MESSAGES[language as keyof typeof STATUS_MESSAGES];

  if (messages && messages[normalizedStatus as keyof typeof messages]) {
    if (status.startsWith('Error: ')) {
      return `Error: ${messages[normalizedStatus as keyof typeof messages]}`;
    }
    return messages[normalizedStatus as keyof typeof messages];
  }

  return status; // Fallback to original status
}

interface VideoProcessingSectionProps {
  file: File;
  videoUrl: string;
  processingStatus: string | null;
  isUploading: boolean;
  uploadProgress: number | null;
  selectedLanguage: string;
  onRenderSubtitles: () => void;
  onReset: () => void;
}

export default function VideoProcessingSection({
  file,
  videoUrl,
  processingStatus,
  isUploading,
  uploadProgress,
  selectedLanguage,
  onRenderSubtitles,
  onReset
}: VideoProcessingSectionProps) {
  // Get localized status message
  const localizedStatus = getStatusMessage(processingStatus, selectedLanguage);

  return (
    <div className="space-y-6">
      <VideoPreview file={file} url={videoUrl} />
      <RenderButton
        onClick={onRenderSubtitles}
        processingStatus={localizedStatus}
        isUploading={isUploading}
        selectedLanguage={selectedLanguage}
      />

      <StepIndicators
        processingStatus={localizedStatus}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        selectedLanguage={selectedLanguage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimelinePanel
          file={file}
          videoUrl={videoUrl}
          processingStatus={localizedStatus}
          selectedLanguage={selectedLanguage}
        />
        <AgentInsightsPanel
          processingStatus={localizedStatus}
          selectedLanguage={selectedLanguage}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TranscriptSample
          processingStatus={localizedStatus}
          selectedLanguage={selectedLanguage}
        />
        <ChunkedGroups
          processingStatus={localizedStatus}
          selectedLanguage={selectedLanguage}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TranslationPreview
          processingStatus={localizedStatus}
          selectedLanguage={selectedLanguage}
        />
        <ValidationChecks
          processingStatus={localizedStatus}
          selectedLanguage={selectedLanguage}
        />
      </div>

      <ExportControls
        file={file}
        videoUrl={videoUrl}
        processingStatus={localizedStatus}
        selectedLanguage={selectedLanguage}
      />
      <MakeAnotherButton
        onReset={onReset}
        processingStatus={localizedStatus}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
}