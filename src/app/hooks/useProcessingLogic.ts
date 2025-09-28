"use client";

import { useCallback, useState } from "react";

export function useProcessingLogic() {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  const handleCancelUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(null);
    setProcessingStatus(null);
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

  const handleRenderSubtitles = useCallback(() => {
    simulateProcessing();
  }, [simulateProcessing]);

  return {
    uploadProgress,
    isUploading,
    processingStatus,
    handleCancelUpload,
    handleRenderSubtitles,
    resetProcessing: () => {
      setUploadProgress(null);
      setIsUploading(false);
      setProcessingStatus(null);
    }
  };
}