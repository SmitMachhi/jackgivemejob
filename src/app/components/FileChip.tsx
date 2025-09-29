"use client";

import { useVideoDuration } from "../hooks/useVideoDuration";

import { VideoIcon } from "./file-chip/VideoIcon";
import { VideoMetadata } from "./file-chip/VideoMetadata";
import { DeleteButton } from "./file-chip/DeleteButton";

interface FileChipProps {
  file: File;
  onDelete: () => void;
}

export default function FileChip({ file, onDelete }: FileChipProps) {
  const duration = useVideoDuration(file);

  return (
    <div className="card bg-base-100 shadow-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <VideoIcon />

        <div className="flex-1">
          <p
            className="font-medium text-primary truncate max-w-xs"
            title={file.name}
          >
            {file.name}
          </p>
          <VideoMetadata file={file} duration={duration} />
        </div>

        <DeleteButton onDelete={onDelete} />
      </div>
    </div>
  );
}