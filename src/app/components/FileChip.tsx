"use client";

import { useState, useEffect } from "react";

const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata"));
    };
    video.src = URL.createObjectURL(file);
  });
};

interface FileChipProps {
  file: File;
  onDelete: () => void;
}

export default function FileChip({ file, onDelete }: FileChipProps) {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    getVideoDuration(file)
      .then(setDuration)
      .catch(() => {
        setDuration(null);
      });
  }, [file]);

  return (
    <div className="card bg-base-100 shadow-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>

        <div className="flex-1">
          <p
            className="font-medium text-primary truncate max-w-xs"
            title={file.name}
          >
            {file.name}
          </p>
          <div className="flex gap-4 text-sm text-secondary">
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            {duration !== null && <span>{Math.round(duration)}s</span>}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="btn btn-ghost btn-sm hover:bg-error/20"
          title="Delete file"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}