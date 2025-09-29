"use client";

import { useCallback, useRef } from "react";

interface UseFileInputHandlersProps {
  onFileSelected: () => void;
  onFileDeleted: () => void;
}

export function useFileInputHandlers({
  onFileSelected,
  onFileDeleted
}: UseFileInputHandlersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(() => {
    onFileSelected();
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