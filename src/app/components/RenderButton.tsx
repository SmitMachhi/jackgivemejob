"use client";

import StatusPill from "./StatusPill";

interface RenderButtonProps {
  onClick: () => void;
  processingStatus: string | null;
  isUploading: boolean;
}

export default function RenderButton({ onClick, processingStatus, isUploading }: RenderButtonProps) {
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
        {processingStatus === 'Done' ? 'Download Subtitled Video' : 'Render Vietnamese Subtitles'}
      </button>
    </div>
  );
}