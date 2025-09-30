import { execSync } from "child_process";
import { existsSync } from "fs";

import { logger } from "@trigger.dev/sdk/v3";

import { VideoMetadata, ProbeErrorCodes } from "../types/types";

const MAX_DURATION_SECONDS = 10.2;
const SUPPORTED_VIDEO_CODECS = ["h264", "hevc", "vp9", "av1"];
const SUPPORTED_AUDIO_CODECS = ["aac", "mp3", "opus", "vorbis"];

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

async function emitProbeStart(jobId: string, filePath: string): Promise<void> {
  logger.log("Probe started", { jobId, filePath });
}

async function emitProbeDone(
  jobId: string,
  metadata: VideoMetadata
): Promise<void> {
  logger.log("Probe completed", { jobId, metadata });
}

async function emitProbeError(
  jobId: string,
  errorCode: keyof ProbeErrorCodes,
  error: string
): Promise<void> {
  logger.error("Probe failed", { jobId, errorCode, error });
}

class VideoValidationError extends Error {
  constructor(public readonly code: keyof ProbeErrorCodes, message: string) {
    super(message);
    this.name = "VideoValidationError";
  }
}

async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  if (!existsSync(filePath)) {
    throw new Error(`Video file not found: ${filePath}`);
  }

  try {
    const ffprobeOutput = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { encoding: "utf8" }
    );

    const probeData = JSON.parse(ffprobeOutput);

    const videoStream = probeData.streams.find(
      (stream: { codec_type: string }) => stream.codec_type === "video"
    );
    const audioStream = probeData.streams.find(
      (stream: { codec_type: string }) => stream.codec_type === "audio"
    );

    if (!videoStream) {
      throw new Error("No video stream found");
    }

    const fps = videoStream.r_frame_rate
      ? parseFloat(videoStream.r_frame_rate.split("/")[0]) /
        parseFloat(videoStream.r_frame_rate.split("/")[1])
      : undefined;

    const metadata = {
      duration: parseFloat(probeData.format.duration),
      hasAudio: !!audioStream,
      width: videoStream.width,
      height: videoStream.height,
      format: probeData.format.format_name,
      size: parseInt(probeData.format.size),
      fps,
      videoCodec: videoStream.codec_name,
      audioCodec: audioStream?.codec_name,
    };

    // Validate the metadata
    if (metadata.duration > MAX_DURATION_SECONDS) {
      throw new VideoValidationError(
        "TOO_LONG",
        `Video duration ${metadata.duration}s exceeds maximum allowed ${MAX_DURATION_SECONDS}s`
      );
    }

    if (!metadata.hasAudio) {
      throw new VideoValidationError(
        "NO_AUDIO",
        "Video must contain an audio track"
      );
    }

    if (
      metadata.videoCodec &&
      !SUPPORTED_VIDEO_CODECS.includes(metadata.videoCodec.toLowerCase())
    ) {
      throw new VideoValidationError(
        "UNSUPPORTED",
        `Unsupported video codec: ${metadata.videoCodec}`
      );
    }

    if (
      metadata.audioCodec &&
      !SUPPORTED_AUDIO_CODECS.includes(metadata.audioCodec.toLowerCase())
    ) {
      throw new VideoValidationError(
        "UNSUPPORTED",
        `Unsupported audio codec: ${metadata.audioCodec}`
      );
    }

    return metadata;
  } catch (error) {
    logger.error("Failed to extract video metadata", { error });
    throw new Error(`Failed to probe video: ${error}`);
  }
}

async function probeVideoFile(
  filePath: string,
  jobId: string
): Promise<VideoMetadata> {
  try {
    await emitProbeStart(jobId, filePath);

    const metadata = await extractVideoMetadata(filePath);

    // Validation is now done within extractVideoMetadata

    await emitProbeDone(jobId, metadata);

    return metadata;
  } catch (error) {
    if (error instanceof VideoValidationError) {
      await emitProbeError(jobId, error.code, error.message);
    } else {
      await emitProbeError(
        jobId,
        "UNSUPPORTED",
        error instanceof Error ? error.message : String(error)
      );
    }
    throw error;
  }
}

export async function validateVideoMetadata(
  jobId: string,
  filePath: string
): Promise<VideoMetadata> {
  return executeWorkflowStep(jobId, "probe", async () => {
    return await probeVideoFile(filePath, jobId);
  });
}
