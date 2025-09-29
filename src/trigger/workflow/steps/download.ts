import { existsSync, mkdirSync, createWriteStream } from "fs";
import { join } from "path";

import axios from "axios";
import { logger } from "@trigger.dev/sdk/v3";

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

async function emitDownloadStart(jobId: string, r2Key: string): Promise<void> {
  logger.log("Download started", { jobId, r2Key });
}

async function emitDownloadDone(
  jobId: string,
  r2Key: string,
  fileSize: number,
  filePath: string
): Promise<void> {
  logger.log("Download completed", {
    jobId,
    r2Key,
    fileSize,
    filePath,
  });
}

async function emitDownloadError(
  jobId: string,
  r2Key: string,
  error: unknown
): Promise<void> {
  logger.error("Download failed", {
    jobId,
    r2Key,
    error: error instanceof Error ? error.message : String(error),
  });
}

function ensureTempDirectory(): void {
  const tmpDir = "/tmp";
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
}

async function downloadFileFromUrl(
  signedUrl: string,
  filePath: string
): Promise<number> {
  const response = await axios.get(signedUrl, {
    responseType: "stream",
  });

  const writer = createWriteStream(filePath);
  let downloadedBytes = 0;

  response.data.on("data", (chunk: Buffer) => {
    downloadedBytes += chunk.length;
  });

  await new Promise<void>((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", () => resolve());
    writer.on("error", reject);
  });

  return downloadedBytes;
}

async function downloadFromR2(
  r2Key: string,
  jobId: string
): Promise<{ filePath: string; fileSize: number }> {
  try {
    const r2Storage = getR2Storage();

    await emitDownloadStart(jobId, r2Key);

    const signedUrl = await r2Storage.getSignedUrl(r2Key, 3600);
    const metadata = await r2Storage.getR2FileMetadata(r2Key);

    ensureTempDirectory();

    const filePath = join("/tmp", "in.mp4");
    const downloadedBytes = await downloadFileFromUrl(signedUrl, filePath);

    if (downloadedBytes !== metadata.size) {
      throw new Error(
        `Download size mismatch: expected ${metadata.size} bytes, got ${downloadedBytes} bytes`
      );
    }

    await emitDownloadDone(jobId, r2Key, metadata.size, filePath);

    return { filePath, fileSize: metadata.size };
  } catch (error) {
    await emitDownloadError(jobId, r2Key, error);
    throw error;
  }
}

export async function downloadVideoFromR2(
  jobId: string,
  r2Key: string
): Promise<{ filePath: string; fileSize: number }> {
  return executeWorkflowStep(jobId, "download", async () => {
    return await downloadFromR2(r2Key, jobId);
  });
}
