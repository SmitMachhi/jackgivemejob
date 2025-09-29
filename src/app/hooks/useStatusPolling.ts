"use client";

export function useStatusPolling() {
  const startPolling = useCallback(async (
    jobId: string,
    setStatus: (status: string) => void,
    setStatusInterval: (interval: NodeJS.Timeout | null) => void
  ) => {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/jobs/${jobId}`);

        if (!statusResponse.ok) {
          if (statusResponse.status === 404) {
            clearInterval(interval);
            setStatusInterval(null);
            setStatus('Error: Job not found');
            return;
          }
          throw new Error('Failed to check job status');
        }

        const jobData = await statusResponse.json();
        const newStatus = jobData.status;
        setStatus(newStatus);

        if (newStatus === 'completed') {
          clearInterval(interval);
          setStatusInterval(null);
          setStatus('Done');
        } else if (newStatus === 'failed') {
          clearInterval(interval);
          setStatusInterval(null);
          setStatus(`Error: ${jobData.error || 'Processing failed'}`);
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    }, 2000);

    setStatusInterval(interval);
  }, []);

  return { startPolling };
}