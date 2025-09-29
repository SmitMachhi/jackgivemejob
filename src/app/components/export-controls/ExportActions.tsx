"use client";

interface ExportActionsProps {
  onDownload: () => void;
  onPreview: () => void;
  isDownloading?: boolean;
}

export function ExportActions({ onDownload, onPreview, isDownloading = false }: ExportActionsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? "Downloading..." : "Download"}
      </button>
      <button
        onClick={onPreview}
        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
      >
        Preview
      </button>
    </div>
  );
}