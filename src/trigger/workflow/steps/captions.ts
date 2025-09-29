import { logger, wait } from "@trigger.dev/sdk/v3";

import { TranscriptionResult, CaptionsResult } from "../types";

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

async function runCaptionAgent(
  _transcription: TranscriptionResult,
  targetLang: string
): Promise<CaptionsResult> {
  logger.log("Running caption agent", { targetLang });

  await wait.for({ seconds: 3 });

  return {
    captions: [
      {
        start: 0,
        end: 5,
        text: "This is a sample caption.",
        targetLang,
      },
    ],
    format: "srt",
  };
}

export async function generateCaptions(
  jobId: string,
  transcription: TranscriptionResult,
  targetLang: string
): Promise<CaptionsResult> {
  return executeWorkflowStep(jobId, "caption-agent", async () => {
    return await runCaptionAgent(transcription, targetLang);
  });
}