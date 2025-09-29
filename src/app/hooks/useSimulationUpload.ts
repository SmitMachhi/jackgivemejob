"use client";

export function useSimulationUpload() {
  const simulateUpload = useCallback((
    setProgress: (progress: number | null) => void,
    setUploading: (uploading: boolean) => void,
    onUploadComplete: () => void
  ) => {
    setUploading(true);
    setProgress(0);

    const uploadInterval = setInterval(() => {
      setProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(uploadInterval);
          setUploading(false);
          onUploadComplete();
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  }, []);

  return { simulateUpload };
}