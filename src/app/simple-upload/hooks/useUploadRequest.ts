"use client";

interface UploadResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

export function useUploadRequest() {
  const sendUploadRequest = async (formData: FormData): Promise<UploadResult> => {
    const response = await fetch('/api/upload/simple', {
      method: 'POST',
      body: formData,
    });

    return await response.json();
  };

  return { sendUploadRequest };
}