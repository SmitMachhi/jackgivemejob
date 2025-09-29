"use client";

import { useState } from "react";

export function useFileUploadState() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const resetUpload = () => {
    setFile(null);
    setUploading(false);
    setStatus(null);
    setJobId(null);
    setResult(null);
  };

  return {
    file,
    uploading,
    status,
    jobId,
    result,
    setResult,
    setFile,
    setUploading,
    setStatus,
    setJobId,
    resetUpload,
  };
}