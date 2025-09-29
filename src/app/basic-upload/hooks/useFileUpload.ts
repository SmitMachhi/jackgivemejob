"use client";

import { useFileUploadState } from "./useFileUploadState";
import { useFileUploadHandlers } from "./useFileUploadHandlers";

export function useFileUpload() {
  const {
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
  } = useFileUploadState();

  const { handleFileChange, handleUpload } = useFileUploadHandlers({
    setFile,
    setUploading,
    setStatus,
    setJobId,
    file,
  });

  return {
    file,
    uploading,
    status,
    jobId,
    result,
    setResult,
    setStatus,
    handleFileChange,
    handleUpload,
    resetUpload,
  };
}
