"use client";

/* eslint-disable no-unused-vars */

import { useCallback } from "react";

import { useUploadFormData } from "./useUploadFormData";
import { useUploadRequest } from "./useUploadRequest";

interface UseFileUploadHandlersProps {
  setFile: (file: File | null) => void;
  setUploading: (uploading: boolean) => void;
  setStatus: (status: string | null) => void;
  setJobId: (jobId: string | null) => void;
  file: File | null;
}

const performUpload = async (
  file: File,
  setUploading: (uploading: boolean) => void,
  setStatus: (status: string | null) => void,
  setJobId: (jobId: string | null) => void,
  createFormData: (file: File) => FormData,
  sendUploadRequest: (
    formData: FormData
  ) => Promise<{ success: boolean; jobId?: string; error?: string }>
) => {
  try {
    setUploading(true);
    setStatus("Uploading...");

    const formData = createFormData(file);
    const result = await sendUploadRequest(formData);

    if (result.success && result.jobId) {
      setJobId(result.jobId);
      setStatus("Processing...");
    } else {
      setStatus(`Error: ${result.error || "Upload failed"}`);
    }
  } catch (error) {
    setStatus(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    setUploading(false);
  }
};

export function useFileUploadHandlers({
  setFile,
  setUploading,
  setStatus,
  setJobId,
  file,
}: UseFileUploadHandlersProps) {
  const { createFormData } = useUploadFormData();
  const { sendUploadRequest } = useUploadRequest();

  const handleFileChange = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);
      setStatus("File selected");
    },
    [setFile, setStatus]
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    await performUpload(
      file,
      setUploading,
      setStatus,
      setJobId,
      createFormData,
      sendUploadRequest
    );
  }, [
    file,
    setUploading,
    setStatus,
    setJobId,
    createFormData,
    sendUploadRequest,
  ]);

  return {
    handleFileChange,
    handleUpload,
  };
}
