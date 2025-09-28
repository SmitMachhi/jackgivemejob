"use client";

interface ProgressBarProps {
  progress: number;
  onCancel: () => void;
}

export default function ProgressBar({ progress, onCancel }: ProgressBarProps) {
  return (
    <div className="card bg-base-100 shadow-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="loading loading-spinner loading-sm text-primary"></div>
        <div className="flex-1">
          <p className="font-medium text-primary">Uploading...</p>
          <p className="text-sm text-secondary">{progress}% complete</p>
        </div>
        <button
          onClick={onCancel}
          className="btn btn-ghost btn-sm hover:bg-error/20"
          title="Cancel upload"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <progress
        className="progress progress-primary w-full"
        value={progress}
        max="100"
      ></progress>
    </div>
  );
}