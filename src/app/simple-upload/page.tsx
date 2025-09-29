'use client';

import { useState } from 'react';

export default function SimpleUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus('Uploading video...');

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('targetLanguage', 'vi');
      formData.append('userId', 'test-user');

      const response = await fetch('/api/upload/simple', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus('Processing started!');
        setJobId(data.jobId);

        // Start checking status
        checkStatus(data.jobId);
      } else {
        setStatus('Upload failed: ' + data.error);
      }
    } catch (error) {
      setStatus('Upload failed: ' + error);
    } finally {
      setUploading(false);
    }
  };

  const checkStatus = async (id: string) => {
    setStatus('Checking status...');

    try {
      const response = await fetch(`/api/status/${id}`);
      const data = await response.json();

      setResult(data);

      if (data.status === 'completed') {
        setStatus('Processing completed!');
      } else if (data.status === 'failed') {
        setStatus('Processing failed');
      } else {
        setStatus('Still processing...');
        // Check again in 3 seconds
        setTimeout(() => checkStatus(id), 3000);
      }
    } catch (error) {
      setStatus('Failed to check status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Simple Video Upload
        </h1>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </form>

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
      </div>
    </div>
  );
}