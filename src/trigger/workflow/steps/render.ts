import { logger, wait } from "@trigger.dev/sdk/v3";

import { CaptionsResult, RenderResult, VideoMetadata } from "../types";

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

async function renderVideo(
  _originalVideo: Buffer,
  captions: CaptionsResult,
  metadata: VideoMetadata
): Promise<RenderResult> {
  logger.log("Rendering video with captions", {
    captionsCount: captions.captions.length,
    videoDuration: metadata.duration,
  });

  await wait.for({ seconds: 10 });

  return {
    outputPath: `/tmp/rendered_${Date.now()}.mp4`,
  };
}

export async function renderFinalVideo(
  jobId: string,
  videoBuffer: Buffer,
  captions: CaptionsResult,
  metadata: VideoMetadata
): Promise<RenderResult> {
  return executeWorkflowStep(jobId, "render", async () => {
    return await renderVideo(videoBuffer, captions, metadata);
  });
}