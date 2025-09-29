'use client';

import { useEffect } from 'react';

import { useFileUpload } from './hooks/useFileUpload';
import { useJobStatus } from './hooks/useJobStatus';
import { UploadForm } from './components/UploadForm';
import { StatusDisplay } from './components/StatusDisplay';

export default function SimpleUploadPage() {
  const {
    file,
    uploading,
    status,
    jobId,
    result,
    setResult,
    handleFileChange,
    handleUpload
  } = useFileUpload();

  const { checkStatus } = useJobStatus();

  useEffect(() => {
    if (jobId && status === 'Processing started!') {
      const newStatus = checkStatus(jobId, setResult);
      if (newStatus) {
        setStatus(newStatus);
      }
    }
  }, [jobId, status, setResult, checkStatus]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Simple Video Upload
        </h1>

        <UploadForm
          file={file}
          uploading={uploading}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
        />

        <StatusDisplay
          status={status}
          jobId={jobId}
          result={result}
        />
      </div>
    </div>
  );
}