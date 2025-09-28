"use client";

import { useCallback } from "react";

interface MakeAnotherButtonProps {
  onReset: () => void;
  processingStatus: string | null;
}

export default function MakeAnotherButton({ onReset, processingStatus }: MakeAnotherButtonProps) {
  const handleClick = useCallback(() => {
    onReset();
  }, [onReset]);

  return (
    <button
      onClick={handleClick}
      className="btn btn-outline btn-success btn-block mt-4"
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
          d="M12 4v16m8-8H4"
        />
      </svg>
      Make Another
    </button>
  );
}