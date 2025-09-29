"use client";

import { EmptyState } from "./upload-zone/EmptyState";
import { FileInput } from "./upload-zone/FileInput";
import { UploadContent } from "./upload-zone/UploadContent";

interface UploadZoneProps {
  isDragOver: boolean;
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
  onDeleteFile: () => void;
  uploadProgress: number | null;
  isUploading: boolean;
  onCancelUpload: () => void;
}

export default function UploadZone({
  isDragOver,
  selectedFile,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClick,
  onDeleteFile,
  uploadProgress,
  isUploading,
  onCancelUpload,
}: UploadZoneProps) {
  return (
    <div
      className={`card card-bordered bg-base-100 cursor-pointer transition-all hover:shadow-lg ${
        isDragOver ? "border-primary bg-primary/5 scale-105" : ""
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <FileInput fileInputRef={fileInputRef} onFileSelect={onFileSelect} />

      {selectedFile ? (
        <UploadContent
          selectedFile={selectedFile}
          onDeleteFile={onDeleteFile}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
          onCancelUpload={onCancelUpload}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
