"use client";

import { useCallback } from "react";

export function useDragHandlers(onFileSelected: (file: File) => void) {
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

  return {
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}