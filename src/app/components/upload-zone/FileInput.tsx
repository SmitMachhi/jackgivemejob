"use client";

interface FileInputProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: () => void;
}

export function FileInput({ fileInputRef, onFileSelect }: FileInputProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="video/*"
      onChange={() => {
    onFileSelect();
  }}
      className="hidden"
    />
  );
}