"use client";

interface FileInputProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
}

export function FileInput({ fileInputRef, onFileSelect }: FileInputProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="video/*"
      onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }}
      className="hidden"
    />
  );
}