"use client";

/* eslint-disable no-unused-vars */

import { generateUploadButton } from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

const UploadButton = generateUploadButton<OurFileRouter>();

function getUploadButtonContent(isUploading: boolean) {
  return (
    <div className="flex items-center gap-2">
      {isUploading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-content"></div>
          Uploading...
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Choose Video File
        </>
      )}
    </div>
  );
}

function UploadRequirements() {
  return (
    <div className="mt-4 p-4 bg-base-200 rounded-lg">
      <h3 className="font-semibold text-sm mb-2">Upload Requirements:</h3>
      <ul className="text-xs space-y-1 text-base-content/70">
        <li>• File types: .mp4, .mov</li>
        <li>• Maximum file size: 64MB</li>
        <li>• Maximum 1 file at a time</li>
      </ul>
    </div>
  );
}

interface UploadThingUploadZoneProps {
  onUploadComplete: (fileData: {
    key: string;
    size: number;
    mime: string;
    url: string;
    name: string;
  }) => void;
  onUploadError?: (error: Error) => void;
}

function UploadThingUploadZoneContent({
  onUploadComplete,
  onUploadError,
}: UploadThingUploadZoneProps) {
  return (
    <div className="w-full">
      <UploadButton
        endpoint="videoUploader"
        onClientUploadComplete={(res) => {
          if (res && res[0]) {
            const fileData = {
              key: res[0].key,
              size: res[0].size,
              mime: res[0].type,
              url: res[0].url,
              name: res[0].name,
            };
            onUploadComplete(fileData);
          }
        }}
        onUploadError={(error: Error) => {
          onUploadError?.(error);
        }}
        className="ut-button:bg-primary ut-button:hover:bg-primary/80 ut-button:text-primary-content"
        content={{
          button: ({ isUploading }: { isUploading: boolean }) =>
            getUploadButtonContent(isUploading),
        }}
        config={{
          mode: "auto",
        }}
      />

      <UploadRequirements />
    </div>
  );
}

export function UploadThingUploadZone({
  onUploadComplete,
  onUploadError,
}: UploadThingUploadZoneProps) {
  return (
    <UploadThingUploadZoneContent
      onUploadComplete={onUploadComplete}
      onUploadError={onUploadError}
    />
  );
}
