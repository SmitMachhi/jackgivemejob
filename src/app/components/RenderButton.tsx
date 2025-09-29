"use client";

import StatusPill from "./StatusPill";
import { languageOptions } from "./LanguageSelector";

interface RenderButtonProps {
  onClick: () => void;
  processingStatus: string | null;
  isUploading: boolean;
  selectedLanguage?: string;
}

export default function RenderButton({ onClick, processingStatus, isUploading, selectedLanguage = 'vi' }: RenderButtonProps) {
  // Get the selected language option
  const selectedOption = languageOptions.find(opt => opt.code === selectedLanguage) || languageOptions[0];

  // Dynamic button text based on selected language
  const renderButtonText = processingStatus === 'Done'
    ? 'Download Subtitled Video'
    : `Render ${selectedOption.name} Subtitles`;

  return (
    <div className="text-center space-y-4">
      {processingStatus && (
        <div className="flex justify-center">
          <StatusPill status={processingStatus} />
        </div>
      )}
      <button
        onClick={onClick}
        className="btn btn-primary btn-lg"
        disabled={processingStatus !== null || isUploading}
      >
        {renderButtonText}
      </button>
    </div>
  );
}