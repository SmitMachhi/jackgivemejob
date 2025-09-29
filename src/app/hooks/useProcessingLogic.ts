"use client";

import { useCallback, useState } from "react";

export function useProcessingLogic() {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const handleCancelUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(null);
    setProcessingStatus(null);
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [statusCheckInterval]);

  // Real API-based processing with language support
  const startRealProcessing = useCallback(async (file: File, targetLanguage: string) => {
    try {
      setProcessingStatus('Uploading');
      setIsUploading(true);
      setUploadProgress(0);

      // Create FormData with file and language
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', targetLanguage);

      // Upload file and start processing
      const response = await fetch('/api/jobs/render', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start processing');
      }

      const result = await response.json();
      const jobId = result.jobId;

      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      setCurrentJobId(jobId);
      setUploadProgress(100);
      setIsUploading(false);
      setProcessingStatus('Queued');

      // Start polling for job status
      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/jobs/${jobId}`);

          if (!statusResponse.ok) {
            if (statusResponse.status === 404) {
              clearInterval(interval);
              setStatusCheckInterval(null);
              setProcessingStatus('Error: Job not found');
              return;
            }
            throw new Error('Failed to check job status');
          }

          const jobData = await statusResponse.json();
          const newStatus = jobData.status;

          setProcessingStatus(newStatus);

          // Handle different job statuses
          if (newStatus === 'completed') {
            clearInterval(interval);
            setStatusCheckInterval(null);
            setProcessingStatus('Done');
          } else if (newStatus === 'failed') {
            clearInterval(interval);
            setStatusCheckInterval(null);
            setProcessingStatus(`Error: ${jobData.error || 'Processing failed'}`);
          }

        } catch (error) {
          console.error('Error checking job status:', error);
          // Don't clear interval on network errors, keep trying
        }
      }, 2000); // Check every 2 seconds

      setStatusCheckInterval(interval);

    } catch (error) {
      console.error('Error starting processing:', error);
      setProcessingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, []);

  const simulateProcessing = useCallback(() => {
    const statuses = [
      'Queued',
      'Uploading',
      'Transcribing',
      'Translating',
      'Validating',
      'Rendering',
      'Done'
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < statuses.length) {
        setProcessingStatus(statuses[currentIndex]);

        if (statuses[currentIndex] === 'Uploading') {
          setIsUploading(true);
          setUploadProgress(0);

          const uploadInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev === null) return 0;
              if (prev >= 100) {
                clearInterval(uploadInterval);
                setIsUploading(false);
                currentIndex++;
                return 100;
              }
              return prev + 20;
            });
          }, 100);
        } else if (statuses[currentIndex] === 'Done') {
          clearInterval(interval);
        } else {
          setTimeout(() => {
            currentIndex++;
          }, 1500);
        }
      }
    }, 500);
  }, []);

  const handleRenderSubtitles = useCallback(async (file?: File, targetLanguage?: string) => {
    // Use real API if file and language are provided, otherwise simulate
    if (file && targetLanguage) {
      await startRealProcessing(file, targetLanguage);
    } else {
      simulateProcessing();
    }
  }, [startRealProcessing, simulateProcessing]);

  const resetProcessing = useCallback(() => {
    setUploadProgress(null);
    setIsUploading(false);
    setProcessingStatus(null);
    setCurrentJobId(null);
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [statusCheckInterval]);

  return {
    uploadProgress,
    isUploading,
    processingStatus,
    currentJobId,
    handleCancelUpload,
    handleRenderSubtitles,
    resetProcessing
  };
}