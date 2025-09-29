"use client";

interface StatusDisplayProps {
  status: string | null;
  jobId: string | null;
  result: any;
}

export function StatusDisplay({ status, jobId, result }: StatusDisplayProps) {
  return (
    <>
      {status && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-700">
            <strong>Status:</strong> {status}
          </p>
        </div>
      )}

      {jobId && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-700">
            <strong>Job ID:</strong> {jobId}
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <h3 className="font-medium text-gray-900 mb-2">Processing Details:</h3>
          <pre className="text-xs text-gray-700 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}