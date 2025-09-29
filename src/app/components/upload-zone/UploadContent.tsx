"use client";

import FileChip from "../FileChip";
import ProgressBar from "../ProgressBar";

interface UploadContentProps {
  selectedFile: File | null;
  onDeleteFile: () => void;
  uploadProgress: number | null;
  isUploading: boolean;
  onCancelUpload: () => void;
}

export function UploadContent({
  selectedFile,
  onDeleteFile,
  uploadProgress,
  isUploading,
  onCancelUpload,
}: UploadContentProps) {
  return (
    <div className="card-body p-6">
      <FileChip file={selectedFile} onDelete={onDeleteFile} />
      {isUploading && uploadProgress !== null && (
        <ProgressBar progress={uploadProgress} onCancel={onCancelUpload} />
      )}
    </div>
  );
}