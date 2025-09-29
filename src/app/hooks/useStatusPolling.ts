"use client";

/* eslint-disable no-unused-vars */

import { useCallback } from "react";

export function useStatusPolling() {
  const startPolling = useCallback(
    async (
      _jobId: string,
      _setStatus: (_status: string) => void,
      setStatusInterval: (_interval: NodeJS.Timeout | null) => void
    ) => {
      const _interval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/jobs/${_jobId}`);

          if (!statusResponse.ok) {
            if (statusResponse.status === 404) {
              clearInterval(_interval);
              setStatusInterval(null);
              _setStatus("Error: Job not found");
              return;
            }
            throw new Error("Failed to check job status");
          }

          const jobData = await statusResponse.json();
          const newStatus = jobData.status;
          _setStatus(newStatus);

          if (newStatus === "completed") {
            clearInterval(_interval);
            setStatusInterval(null);
            _setStatus("Done");
          } else if (newStatus === "failed") {
            clearInterval(_interval);
            setStatusInterval(null);
            _setStatus(`Error: ${jobData.error || "Processing failed"}`);
          }
        } catch (error) {
          console.error("Error checking job status:", error);
        }
      }, 2000);

      setStatusInterval(_interval);
    },
    []
  );

  return { startPolling };
}
