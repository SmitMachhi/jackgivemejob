"use client";

interface FileInputProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileInput({ fileInputRef, onFileSelect }: FileInputProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="video/*"
      onChange={(e) => {
    e.preventDefault();
    onFileSelect(e);
  }}
      className="hidden"
    />
  );
}