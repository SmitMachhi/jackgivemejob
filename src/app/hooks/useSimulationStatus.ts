"use client";

export function useSimulationStatus() {
  const updateStatus = useCallback((setStatus: (status: string) => void, currentIndex: number) => {
    const statuses = [
      'Queued',
      'Uploading',
      'Transcribing',
      'Translating',
      'Validating',
      'Rendering',
      'Done'
    ];

    if (currentIndex < statuses.length) {
      setStatus(statuses[currentIndex]);
      return statuses[currentIndex];
    }
    return null;
  }, []);

  return { updateStatus };
}