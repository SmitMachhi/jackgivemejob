"use client";

import { useState, useCallback } from "react";

interface CopyLinkButtonProps {
  processingStatus: string | null;
}

export function CopyLinkButton({ processingStatus }: CopyLinkButtonProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, []);

  return (
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
  );
}