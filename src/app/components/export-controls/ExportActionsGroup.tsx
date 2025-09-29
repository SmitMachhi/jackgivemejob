"use client";

import { CopyLinkButton } from "./CopyLinkButton";
import { OpenInNewTabButton } from "./OpenInNewTabButton";

interface ExportActionsGroupProps {
  videoUrl: string | null;
  processingStatus: string | null;
}

export function ExportActionsGroup({ videoUrl, processingStatus }: ExportActionsGroupProps) {
  return (
    <div className="space-y-3">
      <CopyLinkButton processingStatus={processingStatus} />
      <OpenInNewTabButton videoUrl={videoUrl} processingStatus={processingStatus} />
    </div>
  );
}