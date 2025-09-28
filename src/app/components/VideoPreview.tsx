"use client";

interface VideoPreviewProps {
  file: File;
  url: string;
}

export default function VideoPreview({ file, url }: VideoPreviewProps) {
  return (
    <div className="card bg-base-100 shadow-lg p-4 mb-6">
      <div className="aspect-video bg-base-200 rounded-lg overflow-hidden">
        <video
          src={url}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="mt-3 text-sm text-secondary">
        <p>Preview: {file.name}</p>
        <p>Type: {file.type}</p>
      </div>
    </div>
  );
}