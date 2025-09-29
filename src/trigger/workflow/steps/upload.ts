import { logger, wait } from "@trigger.dev/sdk/v3";

import { getR2Storage } from "@/shared/storage";

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

async function uploadFinalVideo(
  outputPath: string,
  jobId: string
): Promise<string> {
  logger.log("Uploading final video", { outputPath, jobId });

  await wait.for({ seconds: 2 });

  const r2Storage = getR2Storage();
  const finalKey = `processed/${jobId}/final.mp4`;

  return r2Storage.getPublicUrl(finalKey);
}

export async function uploadProcessedVideo(
  jobId: string,
  outputPath: string
): Promise<string> {
  return executeWorkflowStep(jobId, "upload", async () => {
    return await uploadFinalVideo(outputPath, jobId);
  });
}