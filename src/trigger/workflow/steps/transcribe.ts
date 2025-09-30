import { execSync } from "child_process";
import { existsSync, unlinkSync, createReadStream } from "fs";

import { OpenAI } from "openai";
import { logger } from "@trigger.dev/sdk/v3";

import { TranscriptionResult, TranscriptionErrorCodes } from "../types/types";

interface WhisperTranscription {
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability?: number;
  }>;
}

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

async function emitSttStart(jobId: string, filePath: string): Promise<void> {
  logger.log("STT started", { jobId, filePath });
}

async function emitSttDone(
  jobId: string,
  result: TranscriptionResult
): Promise<void> {
  logger.log("STT completed", { jobId, result });
}

async function emitSttError(
  jobId: string,
  errorCode: keyof TranscriptionErrorCodes,
  error: string
): Promise<void> {
  logger.error("STT failed", { jobId, errorCode, error });
}

class TranscriptionError extends Error {
  readonly code: keyof TranscriptionErrorCodes;

  constructor(
    code: keyof TranscriptionErrorCodes,
    message: string
  ) {
    super(message);
    this.code = code;
    this.name = "TranscriptionError";
  }
}

function extractAudioFromVideo(videoPath: string, outputPath: string): void {
  try {
    execSync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y`, {
      stdio: "pipe"
    });
  } catch (error) {
    throw new TranscriptionError("AUDIO_EXTRACTION_FAILED", `Failed to extract audio: ${error}`);
  }
}

function calculateWPM(words: Array<{ word: string; start: number; end: number }>, duration: number): number {
  if (words.length === 0 || duration <= 0) return 0;
  return Math.round((words.length / duration) * 60);
}

function validateLanguage(language: string): void {
  const supportedLanguages = ["en", "english"];
  if (!supportedLanguages.includes(language.toLowerCase())) {
    throw new TranscriptionError("NOT_ENGLISH", `Detected language '${language}' is not English`);
  }
}

function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY environment variable is required");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function validateTranscriptionLanguage(language: string): void {
  if (language !== "en" && language !== "english") validateLanguage(language);
}

function processTranscriptionData(transcription: WhisperTranscription): {
  segments: Array<{ start: number; end: number; text: string }>;
  words: Array<{ word: string; start: number; end: number; confidence?: number }>;
} {
  const segments = transcription.segments?.map(segment => ({
    start: segment.start,
    end: segment.end,
    text: segment.text,
  })) || [];

  const words = transcription.words?.map(word => ({
    word: word.word,
    start: word.start,
    end: word.end,
    confidence: word.probability,
  })) || [];

  return { segments, words };
}

async function callWhisperAPI(openai: OpenAI, audioPath: string): Promise<WhisperTranscription> {
  const audioFile = createReadStream(audioPath);

  return await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });
}

async function transcribeWithWhisper(audioPath: string): Promise<TranscriptionResult> {
  const openai = createOpenAIClient();

  try {
    const transcription = await callWhisperAPI(openai, audioPath);
    validateTranscriptionLanguage(transcription.language);
    const { segments, words } = processTranscriptionData(transcription);
    const wpm = calculateWPM(words, transcription.duration);

    return { segments, language: transcription.language, wpm, words };
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    throw new TranscriptionError("TRANSCRIPTION_FAILED", `Whisper API failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function transcribeVideoFile(filePath: string, jobId: string): Promise<TranscriptionResult> {
  if (!existsSync(filePath)) throw new Error(`Video file not found: ${filePath}`);
  const audioPath = filePath.replace(/\.[^/.]+$/, ".wav");

  try {
    await emitSttStart(jobId, filePath);
    extractAudioFromVideo(filePath, audioPath);
    const result = await transcribeWithWhisper(audioPath);
    await emitSttDone(jobId, result);
    return result;
  } catch (error) {
    if (error instanceof TranscriptionError) await emitSttError(jobId, error.code, error.message);
    else await emitSttError(jobId, "TRANSCRIPTION_FAILED", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    if (existsSync(audioPath)) {
      try { unlinkSync(audioPath); }
      catch (cleanupError) { logger.warn("Failed to cleanup audio file", { cleanupError }); }
    }
  }
}

export async function transcribeVideo(
  jobId: string,
  filePath: string
): Promise<TranscriptionResult> {
  return executeWorkflowStep(jobId, "transcribe", async () => {
    return await transcribeVideoFile(filePath, jobId);
  });
}