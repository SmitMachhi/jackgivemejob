"use client";

export function EmptyState() {
  return (
    <div className="card-body items-center text-center">
      <div className="mask mask-circle bg-primary/10 p-4 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-primary mb-2">
        Drag and drop your video file here
      </h3>
      <p className="text-sm text-secondary mb-4">or click to browse</p>
      <button className="btn btn-primary">Select file</button>
    </div>
  );
}