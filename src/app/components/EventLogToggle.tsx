"use client";

import { useState, useEffect } from "react";

interface EventLogToggleProps {
  processingStatus: string | null;
  onToggle: () => void;
  eventCount?: number;
  hasWarnings?: boolean;
  hasErrors?: boolean;
}

export default function EventLogToggle({
  processingStatus,
  onToggle,
  eventCount = 0,
  hasWarnings = false,
  hasErrors = false
}: EventLogToggleProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (processingStatus && processingStatus !== 'Done') {
      setPulse(true);
      const interval = setInterval(() => {
        setPulse(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setPulse(false);
    }
  }, [processingStatus]);

  const getStatusColor = () => {
    if (hasErrors) return 'btn-error';
    if (hasWarnings) return 'btn-warning';
    if (processingStatus && processingStatus !== 'Done') return 'btn-primary';
    return 'btn-outline';
  };

  const getStatusIcon = () => {
    if (hasErrors) return '❌';
    if (hasWarnings) return '⚠️';
    if (processingStatus && processingStatus !== 'Done') return '📊';
    return '📋';
  };

  return (
    <button
      onClick={onToggle}
      className={`
        btn btn-sm fixed bottom-4 right-4 z-40 shadow-lg transition-all duration-300
        ${getStatusColor()} ${pulse ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span>Event Log</span>
        {eventCount > 0 && (
          <span className="badge badge-sm badge-white">
            {eventCount}
          </span>
        )}
      </div>
    </button>
  );
}