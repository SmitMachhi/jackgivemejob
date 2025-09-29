"use client";

/* eslint-disable no-unused-vars */

import { useCallback } from "react";

export function useSimulationStatus() {
  const updateStatus = useCallback(
    (setStatus: (newStatus: string) => void, currentIndex: number) => {
      const statuses = [
        "Queued",
        "Uploading",
        "Transcribing",
        "Translating",
        "Validating",
        "Rendering",
        "Done",
      ];

      if (currentIndex < statuses.length) {
        setStatus(statuses[currentIndex]);
        return statuses[currentIndex];
      }
      return null;
    },
    []
  );

  return { updateStatus };
}
