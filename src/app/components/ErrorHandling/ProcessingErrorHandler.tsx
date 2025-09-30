"use client";

import { useCallback } from "react";
import { AlertCircle, RefreshCw, Upload, X } from "lucide-react";

interface ProcessingErrorHandlerProps {
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  onReupload: () => void;
  className?: string;
}

export function ProcessingErrorHandler({
  error,
  isRetrying,
  retryCount,
  onRetry,
  onReset,
  onReupload,
  className = "",
}: ProcessingErrorHandlerProps) {
  const getErrorMessage = useCallback((error: string) => {
    if (error.includes("Failed to start processing")) {
      return "Failed to start processing your video. This might be due to server issues or invalid file format.";
    }
    if (error.includes("UploadThing")) {
      return "Failed to upload your file. Please check your internet connection and try again.";
    }
    if (error.includes("Unauthorized")) {
      return "Authentication error. Please refresh the page and try again.";
    }
    if (error.includes("exceeds")) {
      return "File size exceeds the limit. Please choose a smaller file.";
    }
    if (error.includes("network")) {
      return "Network error. Please check your internet connection.";
    }
    return error;
  }, []);

  const canRetry = retryCount < 3;
  const showRetryButton = error && !isRetrying && canRetry;

  if (!error) {
    return null;
  }

  return (
    <div className={`bg-error/10 border border-error/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-error mb-2">Processing Error</h3>
          <p className="text-sm text-error/80 mb-3">
            {getErrorMessage(error)}
          </p>

          {isRetrying && (
            <div className="flex items-center gap-2 text-sm text-error/70 mb-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Retrying... (Attempt {retryCount} of 3)
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {showRetryButton && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-3 py-2 bg-error text-error-content rounded-md hover:bg-error/90 transition-colors text-sm font-medium"
                disabled={isRetrying}
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                Retry
              </button>
            )}

            <button
              onClick={onReupload}
              className="flex items-center gap-2 px-3 py-2 bg-warning text-warning-content rounded-md hover:bg-warning/90 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Re-upload File
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-2 px-3 py-2 bg-base-300 text-base-content rounded-md hover:bg-base-400 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}