"use client";

interface VideoMetadataProps {
  file: File;
  duration: number | null;
}

export function VideoMetadata({ file, duration }: VideoMetadataProps) {
  return (
    <div className="flex gap-4 text-sm text-secondary">
      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
      {duration !== null && <span>{Math.round(duration)}s</span>}
    </div>
  );
}