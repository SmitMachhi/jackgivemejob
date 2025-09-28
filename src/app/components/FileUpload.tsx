'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  onUploadComplete?: (url: string) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
}

export default function FileUpload({
  onUploadComplete,
  acceptedTypes = '*/*',
  maxSize = 100,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setProgress(100);
      onUploadComplete?.(result.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="file-input file-input-bordered file-input-primary w-full"
        disabled={uploading}
      />

      {uploading && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-secondary text-center">
            Uploading... {progress}%
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progress}
            max="100"
          ></progress>
        </div>
      )}

      {error && (
        <div className="alert alert-error mt-2">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}