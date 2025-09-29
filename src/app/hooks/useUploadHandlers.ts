"use client";

import { useDragHandlers } from "./useDragHandlers";
import { useFileInputHandlers } from "./useFileInputHandlers";

interface UseUploadHandlersProps {
  onFileSelected: () => void;
  onFileDeleted: () => void;
}

export function useUploadHandlers({
  onFileSelected,
  onFileDeleted,
}: UseUploadHandlersProps) {
  const dragHandlers = useDragHandlers();
  const fileInputHandlers = useFileInputHandlers({
    onFileSelected,
    onFileDeleted,
  });

  return {
    ...dragHandlers,
    ...fileInputHandlers,
  };
}
