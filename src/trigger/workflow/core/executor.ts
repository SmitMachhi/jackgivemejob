import { logger } from "@trigger.dev/sdk/v3";

import {
  RenderWorkflowInput,
  WorkflowResult,
  VideoMetadata,
} from "../types";
import {
  downloadVideoFromR2,
  validateVideoMetadata,
  transcribeVideo,
  generateCaptions,
  renderFinalVideo,
  uploadProcessedVideo,
} from "../steps";

async function executeWorkflowSteps(
  payload: RenderWorkflowInput
): Promise<{
  videoBuffer: Buffer;
  videoMetadata: VideoMetadata;
  finalUrl: string;
}> {
  const videoBuffer = await downloadVideoFromR2(
    payload.jobId,
    payload.r2Key
  );

  const videoMetadata = await validateVideoMetadata(
    payload.jobId,
    videoBuffer
  );

  const transcriptionResult = await transcribeVideo(
    payload.jobId,
    videoBuffer,
    videoMetadata
  );

  const captions = await generateCaptions(
    payload.jobId,
    transcriptionResult,
    payload.targetLang
  );

  const renderedVideo = await renderFinalVideo(
    payload.jobId,
    videoBuffer,
    captions,
    videoMetadata
  );

  const finalUrl = await uploadProcessedVideo(
    payload.jobId,
    renderedVideo.outputPath
  );

  return {
    videoBuffer,
    videoMetadata,
    finalUrl,
  };
}

function createWorkflowResult(
  payload: RenderWorkflowInput,
  finalUrl: string,
  metadata: VideoMetadata
): WorkflowResult {
  return {
    success: true,
    jobId: payload.jobId,
    finalUrl,
    metadata,
  };
}

export async function executeWorkflow(
  payload: RenderWorkflowInput
): Promise<WorkflowResult> {
  logger.log("Starting RenderWorkflow", { payload });

  try {
    const results = await executeWorkflowSteps(payload);

    logger.log("RenderWorkflow completed successfully", {
      jobId: payload.jobId,
      finalUrl: results.finalUrl,
    });

    return createWorkflowResult(
      payload,
      results.finalUrl,
      results.videoMetadata
    );
  } catch (error) {
    logger.error("RenderWorkflow failed", { error, payload });
    throw error;
  }
}