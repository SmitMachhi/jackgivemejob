"use client";

import { useCallback, useState } from "react";

export function useProcessingStatus() {
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const setStatus = useCallback((status: string) => {
    setProcessingStatus(status);
  }, []);

  const setJobId = useCallback((jobId: string) => {
    setCurrentJobId(jobId);
  }, []);

  const setStatusInterval = useCallback((interval: NodeJS.Timeout | null) => {
    setStatusCheckInterval(interval);
  }, []);

  const resetStatus = useCallback(() => {
    setProcessingStatus(null);
    setCurrentJobId(null);
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [statusCheckInterval]);

  return {
    processingStatus,
    currentJobId,
    statusCheckInterval,
    setStatus,
    setJobId,
    setStatusInterval,
    resetStatus
  };
}