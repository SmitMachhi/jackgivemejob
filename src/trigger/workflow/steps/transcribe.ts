import { logger, wait } from "@trigger.dev/sdk/v3";

import { VideoMetadata, TranscriptionResult } from "../types";

async function executeWorkflowStep<T>(
  jobId: string,
  stepName: string,
  stepFn: () => Promise<T>
): Promise<T> {
  logger.log(`Executing ${stepName}`, { jobId });
  try {
    return await stepFn();
  } catch (error) {
    logger.error(`${stepName} failed`, { jobId, error });
    throw error;
  }
}

async function transcribeEn(
  _videoBuffer: Buffer,
  metadata: VideoMetadata
): Promise<TranscriptionResult> {
  logger.log("Transcribing video to English", { duration: metadata.duration });

  await wait.for({ seconds: 5 });

  return {
    segments: [
      {
        start: 0,
        end: 5,
        text: "This is a sample transcription segment.",
      },
    ],
    language: "en",
  };
}

export async function transcribeVideo(
  jobId: string,
  videoBuffer: Buffer,
  metadata: VideoMetadata
): Promise<TranscriptionResult> {
  return executeWorkflowStep(jobId, "transcribe", async () => {
    return await transcribeEn(videoBuffer, metadata);
  });
}