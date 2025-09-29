"use client";

interface JobResult {
  status: string;
  error?: string;
  [key: string]: unknown;
}

export function useJobStatus() {
  const checkStatus = async (id: string, setResult: (result: JobResult) => void) => {
    try {
      const response = await fetch(`/api/status/${id}`);
      const data = await response.json();

      setResult(data);

      if (data.status === 'completed') {
        return 'Processing completed!';
      } else if (data.status === 'failed') {
        return 'Processing failed';
      } else {
        setTimeout(() => checkStatus(id, setResult), 3000);
        return 'Still processing...';
      }
    } catch {
      return 'Failed to check status';
    }
  };

  return { checkStatus };
}