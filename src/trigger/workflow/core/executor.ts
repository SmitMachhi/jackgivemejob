import { logger } from "@trigger.dev/sdk/v3";
import { readFileSync } from "fs";

import {
  RenderWorkflowInput,
  WorkflowResult,
  VideoMetadata,
} from "../types/types";
import { downloadVideoFromR2 } from "../steps/download";
import { validateVideoMetadata } from "../steps/probe";
import { transcribeVideo } from "../steps/transcribe";
import { generateCaptions } from "../steps/captions";
import { renderFinalVideo } from "../steps/render";
import { uploadProcessedVideo } from "../steps/upload";

async function executeWorkflowSteps(
  payload: RenderWorkflowInput
): Promise<{
  videoMetadata: VideoMetadata;
  finalUrl: string;
}> {
  const downloadResult = await downloadVideoFromR2(
    payload.jobId,
    payload.r2Key
  );

  const videoMetadata = await validateVideoMetadata(
    payload.jobId,
    downloadResult.filePath
  );

  const transcriptionResult = await transcribeVideo(
    payload.jobId,
    downloadResult.filePath
  );

  const captions = await generateCaptions(
    payload.jobId,
    transcriptionResult,
    payload.targetLang
  );

  const videoBuffer = readFileSync(downloadResult.filePath);
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