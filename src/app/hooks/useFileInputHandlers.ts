"use client";

import { useCallback, useRef } from "react";

interface UseFileInputHandlersProps {
  onFileSelected: (file: File) => void;
  onFileDeleted: () => void;
}

export function useFileInputHandlers({
  onFileSelected,
  onFileDeleted
}: UseFileInputHandlersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  }, [onFileSelected]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDeleteFile = useCallback(() => {
    onFileDeleted();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFileDeleted]);

  return {
    fileInputRef,
    handleFileSelect,
    handleClickUpload,
    handleDeleteFile
  };
}