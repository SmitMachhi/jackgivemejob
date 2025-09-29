"use client";

export function useUploadFormData() {
  const createFormData = (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('targetLanguage', 'vi');
    formData.append('userId', 'test-user');
    return formData;
  };

  return { createFormData };
}