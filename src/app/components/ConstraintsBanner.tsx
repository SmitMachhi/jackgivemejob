"use client";

export default function ConstraintsBanner() {
  return (
    <div className="alert alert-info mb-6 bg-neutral">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="stroke-current shrink-0 w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className="font-medium">File Requirements:</p>
        <p className="text-sm">
          MP4, WebM, or MOV files • ≤10s, ≤50MB, English Audio only
        </p>
      </div>
    </div>
  );
}
