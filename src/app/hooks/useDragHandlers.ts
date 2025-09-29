"use client";

import { useCallback } from "react";

export function useDragHandlers() {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return {
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}