"use client";

import { useCallback, useState } from "react";

interface ExportControlsProps {
  file: File;
  videoUrl: string | null;
  processingStatus: string | null;
}

export default function ExportControls({
  file,
  videoUrl,
  processingStatus
}: ExportControlsProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = videoUrl || URL.createObjectURL(file);
    link.download = `subtitled_${file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [file, videoUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  }, [videoUrl]);

  return (
    <div className="card bg-base-100 shadow-lg p-4">
      <h3 className="text-lg font-semibold text-primary mb-4">
        Export Options
      </h3>
      <div className="space-y-3">
        <button
          onClick={handleDownload}
          className="btn btn-primary btn-block"
          disabled={processingStatus !== "Done"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download MP4
        </button>

        <button
          onClick={handleCopyLink}
          className="btn btn-secondary btn-block"
          disabled={processingStatus !== "Done"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {copySuccess ? 'Copied!' : 'Copy Link'}
        </button>

        <button
          onClick={handleOpenInNewTab}
          className="btn btn-outline btn-block"
          disabled={processingStatus !== "Done"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Open in New Tab
        </button>
      </div>
    </div>
  );
}