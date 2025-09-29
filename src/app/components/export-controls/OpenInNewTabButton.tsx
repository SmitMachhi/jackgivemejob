"use client";

import { useCallback } from "react";

interface OpenInNewTabButtonProps {
  videoUrl: string | null;
  processingStatus: string | null;
}

export function OpenInNewTabButton({
  videoUrl,
  processingStatus,
}: OpenInNewTabButtonProps) {
  const handleOpenInNewTab = useCallback(() => {
    if (videoUrl) {
      window.open(videoUrl, "_blank");
    }
  }, [videoUrl]);

  return (
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
  );
}
