"use client";

import { useDragHandlers } from "./useDragHandlers";
import { useFileInputHandlers } from "./useFileInputHandlers";

interface UseUploadHandlersProps {
  onFileSelected: (file: File) => void;
  onFileDeleted: () => void;
}

export function useUploadHandlers({
  onFileSelected,
  onFileDeleted
}: UseUploadHandlersProps) {
  const dragHandlers = useDragHandlers(onFileSelected);
  const fileInputHandlers = useFileInputHandlers({ onFileSelected, onFileDeleted });

  return {
    ...dragHandlers,
    ...fileInputHandlers
  };
}