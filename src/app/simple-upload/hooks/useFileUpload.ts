"use client";

import { useState } from "react";

import { useUploadFormData } from "./useUploadFormData";
import { useUploadRequest } from "./useUploadRequest";

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const { createFormData } = useUploadFormData();
  const { sendUploadRequest } = useUploadRequest();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus('Uploading video...');

    try {
      const formData = createFormData(file);
      const data = await sendUploadRequest(formData);

      if (data.success) {
        setStatus('Processing started!');
        setJobId(data.jobId);
      } else {
        setStatus('Upload failed: ' + data.error);
      }
    } catch (error) {
      setStatus('Upload failed: ' + error);
    } finally {
      setUploading(false);
    }
  };

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
    handleFileChange,
    handleUpload,
    resetUpload
  };
}