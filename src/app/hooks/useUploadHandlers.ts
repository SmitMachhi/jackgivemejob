"use client";

import { useCallback, useRef } from "react";

interface UseUploadHandlersProps {
  onFileSelected: (file: File) => void;
  onFileDeleted: () => void;
}

export function useUploadHandlers({
  onFileSelected,
  onFileDeleted
}: UseUploadHandlersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/")) {
        onFileSelected(file);
      }
    }
  }, [onFileSelected]);

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
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handleClickUpload,
    handleDeleteFile
  };
}