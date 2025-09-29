"use client";

import { useState, useCallback } from "react";

import { ExportHeader } from "./export-controls/ExportHeader";
import { ExportFormatSelector } from "./export-controls/ExportFormatSelector";
import { ExportActions } from "./export-controls/ExportActions";
import { ExportActionsGroup } from "./export-controls/ExportActionsGroup";

interface ExportControlsProps {
  file: File;
  videoUrl: string | null;
  processingStatus: string | null;
}

function useExportControls(file: File, videoUrl: string | null) {
  const [selectedFormat, setSelectedFormat] = useState("srt");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = videoUrl || URL.createObjectURL(file);
      link.download = `subtitled_${file.name.replace(/\.[^/.]+$/, "")}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  }, [file, videoUrl, selectedFormat]);

  const handlePreview = useCallback(() => {
    console.log('Preview functionality would go here');
  }, []);

  return {
    selectedFormat,
    setSelectedFormat,
    isDownloading,
    handleDownload,
    handlePreview
  };
}

export default function ExportControls({
  file,
  videoUrl,
  processingStatus
}: ExportControlsProps) {
  const {
    selectedFormat,
    setSelectedFormat,
    isDownloading,
    handleDownload,
    handlePreview
  } = useExportControls(file, videoUrl);

  return (
    <div className="card bg-base-100 shadow-lg p-4">
      <ExportHeader />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <ExportFormatSelector
            selectedFormat={selectedFormat}
            onFormatChange={setSelectedFormat}
          />
        </div>

        <ExportActions
          onDownload={handleDownload}
          onPreview={handlePreview}
          isDownloading={isDownloading}
        />

        <ExportActionsGroup
          videoUrl={videoUrl}
          processingStatus={processingStatus}
        />
      </div>
    </div>
  );
}