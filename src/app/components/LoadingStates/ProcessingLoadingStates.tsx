"use client";

import { Loader2, Upload, CheckCircle, Clock } from "lucide-react";

interface ProcessingLoadingStatesProps {
  isUploading: boolean;
  uploadProgress: number;
  isRetrying: boolean;
  retryCount: number;
  stage: "upload" | "api" | "complete";
  className?: string;
}

export function ProcessingLoadingStates({
  isUploading,
  uploadProgress,
  isRetrying,
  retryCount,
  stage,
  className = "",
}: ProcessingLoadingStatesProps) {
  if (!isUploading) {
    return null;
  }

  const getStageInfo = () => {
    switch (stage) {
      case "upload":
        return {
          title: "Uploading to Cloud",
          description: "Your file is being uploaded to secure cloud storage",
          icon: Upload,
          color: "text-primary",
        };
      case "api":
        return {
          title: "Starting Processing",
          description: "Setting up your video processing job",
          icon: Loader2,
          color: "text-secondary",
        };
      case "complete":
        return {
          title: "Processing Started",
          description: "Your video is now being processed",
          icon: CheckCircle,
          color: "text-success",
        };
      default:
        return {
          title: "Processing",
          description: "Working on your request",
          icon: Loader2,
          color: "text-primary",
        };
    }
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  return (
    <div className={`bg-base-200/50 border border-base-300 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${stageInfo.color} ${stage === "api" ? "animate-spin" : ""}`} />
        <div>
          <h3 className="font-semibold text-base-content">{stageInfo.title}</h3>
          <p className="text-sm text-base-content/70">{stageInfo.description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-base-content/70">Progress</span>
          <span className="font-medium text-base-content">{uploadProgress}%</span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>

      {isRetrying && (
        <div className="mt-3 flex items-center gap-2 text-sm text-warning">
          <Clock className="w-4 h-4" />
          <span>Retrying (Attempt {retryCount} of 3)...</span>
        </div>
      )}

      {stage === "complete" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-success">
          <CheckCircle className="w-4 h-4" />
          <span>Ready for processing!</span>
        </div>
      )}
    </div>
  );
}