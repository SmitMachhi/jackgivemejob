"use client";

import { useState, useCallback } from "react";

export function useDragState() {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSetDragOver = useCallback(() => {
    setIsDragOver(true);
  }, []);

  const handleSetDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return {
    isDragOver,
    setIsDragOver,
    handleSetDragOver,
    handleSetDragLeave,
  };
}
