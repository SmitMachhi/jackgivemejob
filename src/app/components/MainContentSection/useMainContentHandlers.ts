"use client";

/* eslint-disable no-unused-vars */

export function useMainContentHandlers(
  uploadHandlers: Record<string, unknown>,
  setIsDragOver: (value: boolean) => void,
  handleRenderSubtitles: () => void
) {
  const handleDragOver = () => {
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = () => {
    setIsDragOver(false);
  };

  const handleRenderClick = () => {
    handleRenderSubtitles();
  };

  return {
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRenderClick,
  };
}
