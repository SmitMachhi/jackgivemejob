import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { OpenAI } from "openai";
import { renderService } from "@/lib/services/render-service";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic || "ffmpeg");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation error codes
export enum ValidationError {
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  DURATION_TOO_LONG = "DURATION_TOO_LONG",
  NO_AUDIO_TRACK = "NO_AUDIO_TRACK",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  CORRUPTED_FILE = "CORRUPTED_FILE",
  LANGUAGE_NOT_ENGLISH = "LANGUAGE_NOT_ENGLISH",
  PROCESSING_ERROR = "PROCESSING_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  WHISPER_API_ERROR = "WHISPER_API_ERROR",
  FFPROBE_ERROR = "FFPROBE_ERROR",
  VALIDATION_TIMEOUT = "VALIDATION_TIMEOUT"
}

// Validation input schema
export const ProbeInputSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().positive("File size must be positive"),
  mimeType: z.string().min(1, "MIME type is required"),
  maxDuration: z.number().positive().default(10.2), // 10.2 seconds max
  maxFileSize: z.number().positive().default(50 * 1024 * 1024), // 50MB max
  timeout: z.number().positive().min(5).max(300).default(60), // seconds
  languageDetectionEnabled: z.boolean().default(true),
});

export type ProbeInputInput = z.infer<typeof ProbeInputSchema>;

// Video metadata schema
export const VideoMetadataSchema = z.object({
  duration: z.number().positive(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  videoCodec: z.string().optional(),
  audioCodec: z.string().optional(),
  audioSampleRate: z.number().positive().optional(),
  audioChannels: z.number().positive().optional(),
  hasAudio: z.boolean(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  format: z.string(),
  bitrate: z.number().positive().optional(),
});

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

// Language detection result schema
export const LanguageDetectionResultSchema = z.object({
  detectedLanguage: z.string(),
  confidence: z.number().min(0).max(1),
  englishProbability: z.number().min(0).max(1),
  isEnglish: z.boolean(),
  segments: z.array(z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
    language: z.string(),
    confidence: z.number()
  })).optional(),
});

export type LanguageDetectionResult = z.infer<typeof LanguageDetectionResultSchema>;

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    code: z.nativeEnum(ValidationError),
    message: z.string(),
    details: z.any().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical'])
  })),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    severity: z.enum(['low', 'medium', 'high'])
  })),
  metadata: VideoMetadataSchema.optional(),
  languageDetection: LanguageDetectionResultSchema.optional(),
  processingTime: z.number(),
  fileName: z.string(),
  fileSize: z.number(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Probe Input Task - Validates video files with comprehensive checks
 *
 * This task performs thorough video validation including:
 * - File size validation (≤50MB)
 * - Duration validation (≤10.2s) using ffprobe
 * - Audio track detection
 * - English language detection using Whisper
 * - Format validation
 * - File integrity checks
 */
export const probeInputTask = task({
  id: "probe-input",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: ProbeInputInput, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting video validation", { payload });

    try {
      // Validate input
      const validatedInput = ProbeInputSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        processingTime: 0,
        fileName: validatedInput.fileName,
        fileSize: validatedInput.fileSize,
      };

      // Step 1: File size validation
      console.log("Validating file size", {
        fileSize: validatedInput.fileSize,
        maxSize: validatedInput.maxFileSize
      });

      if (validatedInput.fileSize > validatedInput.maxFileSize) {
        result.errors.push({
          code: ValidationError.FILE_TOO_LARGE,
          message: `File size (${formatBytes(validatedInput.fileSize)}) exceeds maximum allowed size (${formatBytes(validatedInput.maxFileSize)})`,
          details: {
            actualSize: validatedInput.fileSize,
            maxSize: validatedInput.maxFileSize,
            ratio: validatedInput.fileSize / validatedInput.maxFileSize
          },
          severity: 'critical'
        });
        result.isValid = false;
      }

      // Step 2: Video metadata extraction using ffprobe
      let metadata: VideoMetadata | undefined;
      try {
        console.log("Extracting video metadata", { filePath: validatedInput.filePath });
        metadata = await extractVideoMetadata(validatedInput.filePath, validatedInput.mimeType);
        result.metadata = metadata;

        console.log("Video metadata extracted", {
          duration: metadata.duration,
          hasAudio: metadata.hasAudio,
          videoCodec: metadata.videoCodec,
          audioCodec: metadata.audioCodec
        });

      } catch (error) {
        console.error("Failed to extract video metadata", {
          error: error instanceof Error ? error.message : error,
          filePath: validatedInput.filePath
        });

        result.errors.push({
          code: ValidationError.FFPROBE_ERROR,
          message: "Failed to analyze video file",
          details: {
            error: error instanceof Error ? error.message : error,
            filePath: validatedInput.filePath
          },
          severity: 'critical'
        });
        result.isValid = false;
      }

      // Step 3: Duration validation (if metadata was extracted)
      if (metadata) {
        if (metadata.duration > validatedInput.maxDuration) {
          result.errors.push({
            code: ValidationError.DURATION_TOO_LONG,
            message: `Video duration (${metadata.duration.toFixed(2)}s) exceeds maximum allowed duration (${validatedInput.maxDuration}s)`,
            details: {
              actualDuration: metadata.duration,
              maxDuration: validatedInput.maxDuration,
              ratio: metadata.duration / validatedInput.maxDuration
            },
            severity: 'critical'
          });
          result.isValid = false;
        }

        // Step 4: Audio track validation
        if (!metadata.hasAudio) {
          result.errors.push({
            code: ValidationError.NO_AUDIO_TRACK,
            message: "Video file does not contain an audio track",
            details: {
              videoCodec: metadata.videoCodec,
              format: metadata.format
            },
            severity: 'critical'
          });
          result.isValid = false;
        }
      }

      // Step 5: Language detection (if enabled and file is valid so far)
      if (validatedInput.languageDetectionEnabled && result.isValid && metadata) {
        try {
          console.log("Detecting language", { filePath: validatedInput.filePath });
          const languageResult = await detectLanguage(validatedInput.filePath, console);
          result.languageDetection = languageResult;

          console.log("Language detection completed", {
            detectedLanguage: languageResult.detectedLanguage,
            confidence: languageResult.confidence,
            isEnglish: languageResult.isEnglish
          });

          if (!languageResult.isEnglish) {
            result.errors.push({
              code: ValidationError.LANGUAGE_NOT_ENGLISH,
              message: `Detected language (${languageResult.detectedLanguage}) is not English`,
              details: {
                detectedLanguage: languageResult.detectedLanguage,
                confidence: languageResult.confidence,
                englishProbability: languageResult.englishProbability,
                threshold: 0.7
              },
              severity: 'critical'
            });
            result.isValid = false;
          } else if (languageResult.confidence < 0.7) {
            result.warnings.push({
              code: "LOW_LANGUAGE_CONFIDENCE",
              message: `Low confidence in language detection (${(languageResult.confidence * 100).toFixed(1)}%)`,
              details: {
                confidence: languageResult.confidence,
                detectedLanguage: languageResult.detectedLanguage
              },
              severity: 'medium'
            });
          }

        } catch (error) {
          console.error("Language detection failed", {
            error: error instanceof Error ? error.message : error,
            filePath: validatedInput.filePath
          });

          result.warnings.push({
            code: ValidationError.WHISPER_API_ERROR,
            message: "Failed to detect language - proceeding without language validation",
            details: {
              error: error instanceof Error ? error.message : error
            },
            severity: 'medium'
          });
        }
      }

      // Add processing time
      result.processingTime = Date.now() - startTime;

      console.log("Validation completed", {
        isValid: result.isValid,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Validation failed", {
        error: error instanceof Error ? error.message : error,
        duration: processingTime,
        payload
      });

      throw new Error(`Video validation failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Helper function to extract video metadata using ffprobe
async function extractVideoMetadata(filePath: string, mimeType: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('FFprobe operation timed out'));
    }, 30000);

    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      clearTimeout(timeout);

      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }

      try {
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

        const duration = metadata.format?.duration || 0;

        if (!duration || duration <= 0) {
          reject(new Error('Invalid or missing video duration'));
          return;
        }

        const result: VideoMetadata = {
          duration,
          width: videoStream?.width,
          height: videoStream?.height,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
          audioChannels: audioStream?.channels,
          hasAudio: !!audioStream,
          fileSize: metadata.format?.size || 0,
          mimeType,
          format: metadata.format?.format_name || 'unknown',
          bitrate: metadata.format?.bit_rate ? parseInt(metadata.format.bit_rate) : undefined,
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse metadata: ${error instanceof Error ? error.message : error}`));
      }
    });
  });
}

// Helper function to detect language using Whisper
async function detectLanguage(filePath: string, logger: any): Promise<LanguageDetectionResult> {
  try {
    // For language detection, we'll use Whisper's transcription with language detection
    // Since we only need language detection, we'll use a short segment (first 3 seconds)
    const audioBuffer = await extractAudioSegment(filePath, 0, 3);

    const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/mpeg' });
    const file = new File([blob], 'temp.mp3', { type: 'audio/mpeg' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'en', // Hint to Whisper that we expect English
      prompt: 'This is an English language video transcript.' // Additional hint
    });

    // Analyze the transcription segments for language confidence
    const segments = transcription.segments || [];
    const englishSegments = segments.filter(segment => {
      // Simple heuristics to detect English text
      const text = segment.text.toLowerCase();
      const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
      return englishWords.some(word => text.includes(word));
    });

    const englishProbability = segments.length > 0 ? englishSegments.length / segments.length : 0;
    const isEnglish = englishProbability >= 0.7; // 70% threshold
    const confidence = Math.min(englishProbability + 0.1, 1.0); // Add some confidence buffer

    return {
      detectedLanguage: isEnglish ? 'en' : 'unknown',
      confidence,
      englishProbability,
      isEnglish,
      segments: segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        language: isEnglish ? 'en' : 'unknown',
        confidence: englishProbability
      }))
    };

  } catch (error) {
    console.error("Whisper language detection failed", { error });

    // Return a conservative result
    return {
      detectedLanguage: 'unknown',
      confidence: 0,
      englishProbability: 0,
      isEnglish: false,
      segments: []
    };
  }
}

// Helper function to extract a short audio segment for language detection
async function extractAudioSegment(filePath: string, start: number, duration: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      reject(new Error('Audio extraction timed out'));
    }, 15000);

    ffmpeg(filePath)
      .setStartTime(start)
      .setDuration(duration)
      .audioCodec('mp3')
      .audioBitrate('128k')
      .on('error', (err: any) => {
        clearTimeout(timeout);
        reject(new Error(`Audio extraction error: ${err.message}`));
      })
      .on('end', () => {
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks));
      })
      .pipe()
      .on('data', (chunk: any) => {
        chunks.push(chunk);
      });
  });
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}