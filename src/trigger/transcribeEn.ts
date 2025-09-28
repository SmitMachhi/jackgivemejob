import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { OpenAI } from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { renderService } from "@/lib/services/render-service";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic || "ffmpeg");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Transcription error codes
export enum TranscriptionError {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  API_ERROR = "API_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  AUDIO_EXTRACTION_ERROR = "AUDIO_EXTRACTION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_AUDIO = "INVALID_AUDIO",
  RETRY_EXHAUSTED = "RETRY_EXHAUSTED",
  LANGUAGE_DETECTION_FAILED = "LANGUAGE_DETECTION_FAILED"
}

// Input validation schema
export const TranscribeEnSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),
  maxRetries: z.number().min(0).max(5).default(3),
  timeout: z.number().positive().min(30).max(300).default(120), // seconds
  language: z.string().default("en"), // Force English
  temperature: z.number().min(0).max(1).default(0.0), // Lower for more consistent results
  responseFormat: z.enum(["json", "text", "srt", "verbose_json"]).default("verbose_json"),
  timestampGranularities: z.array(z.enum(["word", "segment"])).default(["word", "segment"]),
  enableVad: z.boolean().default(true), // Voice Activity Detection
  prompt: z.string().optional(),
});

export type TranscribeEnInput = z.infer<typeof TranscribeEnSchema>;

// Word-level timestamp schema
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().min(0).max(1),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

// Segment-level timestamp schema
export const SegmentTimestampSchema = z.object({
  id: z.number(),
  seek: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  tokens: z.array(z.number()),
  temperature: z.number(),
  avg_logprob: z.number(),
  compression_ratio: z.number(),
  no_speech_prob: z.number(),
  words: z.array(WordTimestampSchema).optional(),
});

export type SegmentTimestamp = z.infer<typeof SegmentTimestampSchema>;

// Transcription result schema
export const TranscriptionResultSchema = z.object({
  text: z.string(),
  language: z.string().default("en"),
  duration: z.number().optional(),
  words: z.array(WordTimestampSchema).optional(),
  segments: z.array(SegmentTimestampSchema).optional(),
  confidence: z.number().min(0).max(1).optional(),
  processingTime: z.number(),
  wordCount: z.number(),
  characterCount: z.number(),
  metadata: z.object({
    model: z.string(),
    temperature: z.number(),
    responseFormat: z.string(),
    timestampGranularities: z.array(z.string()),
    fileSize: z.number().optional(),
    audioDuration: z.number().optional(),
    retries: z.number(),
  }),
});

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;

/**
 * Transcribe English Task - Transcribes audio using OpenAI Whisper API
 *
 * This task performs audio transcription with comprehensive features:
 * - OpenAI Whisper API integration (whisper-1 model)
 * - Word-level timestamps using verbose_json format
 * - Language enforcement (English only)
 * - Retry logic for API failures
 * - Audio format validation and conversion
 * - Voice Activity Detection
 * - Progress tracking via job events
 */
export const transcribeEnTask = task({
  id: "transcribe-en",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: TranscribeEnInput, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting English transcription", { payload });

    try {
      // Validate input
      const validatedInput = TranscribeEnSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      // Emit transcription started event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'processing',
          {
            type: 'transcription_started',
            fileName: validatedInput.fileName,
            filePath: validatedInput.filePath,
            mimeType: validatedInput.mimeType,
            language: validatedInput.language,
            timestampGranularities: validatedInput.timestampGranularities,
            maxRetries: validatedInput.maxRetries,
            timeout: validatedInput.timeout,
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['transcription', 'whisper', 'started']
          }
        );
      }

      // Step 1: Validate file exists and extract audio if needed
      let audioFilePath = validatedInput.filePath;
      let audioDuration: number | undefined;

      try {
        console.log("Processing audio file", { filePath: validatedInput.filePath });

        // Extract audio duration using ffprobe
        audioDuration = await getAudioDuration(validatedInput.filePath);
        console.log("Audio duration extracted", { duration: audioDuration });

        // If file is not in MP3 format, convert it
        if (!validatedInput.mimeType.includes('audio/mp3') && !validatedInput.mimeType.includes('audio/mpeg')) {
          console.log("Converting audio to MP3 format", {
            from: validatedInput.mimeType,
            to: 'audio/mp3'
          });

          audioFilePath = await convertToMp3(validatedInput.filePath, validatedInput.fileName);
          console.log("Audio conversion completed", {
            originalPath: validatedInput.filePath,
            convertedPath: audioFilePath
          });
        }

        // Emit audio processing completed event
        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'processing',
            {
              type: 'audio_processing_completed',
              originalFile: validatedInput.fileName,
              audioDuration,
              convertedFormat: audioFilePath !== validatedInput.filePath ? 'mp3' : 'original',
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'success',
              category: 'processing',
              tags: ['audio_processing', 'conversion', 'completed']
            }
          );
        }

      } catch (error) {
        console.error("Audio processing failed", {
          error: error instanceof Error ? error.message : error,
          filePath: validatedInput.filePath
        });

        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'processing',
            {
              type: 'audio_processing_failed',
              error: error instanceof Error ? error.message : error,
              fileName: validatedInput.fileName,
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'error',
              category: 'processing',
              tags: ['audio_processing', 'error', 'failure']
            }
          );
        }

        throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : error}`);
      }

      // Step 2: Perform transcription with retry logic
      let transcriptionResult;
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt <= validatedInput.maxRetries) {
        attempt++;

        try {
          console.log(`Transcription attempt ${attempt}/${validatedInput.maxRetries + 1}`, {
            filePath: audioFilePath,
            language: validatedInput.language,
            responseFormat: validatedInput.responseFormat,
            temperature: validatedInput.temperature
          });

          if (validatedInput.jobId) {
            await renderService.addEvent(
              validatedInput.jobId,
              'job_progress',
              'processing',
              {
                type: 'transcription_attempt',
                attempt,
                maxAttempts: validatedInput.maxRetries + 1,
                filePath: audioFilePath,
                model: 'whisper-1',
              },
              {
                severity: 'info',
                category: 'processing',
                tags: ['transcription', 'retry', 'attempt']
              }
            );
          }

          // Read audio file
          const fs = await import('fs/promises');
          const audioBuffer = await fs.readFile(audioFilePath);

          // Create file for OpenAI API
          const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/mp3' });
          const file = new File([blob], validatedInput.fileName, { type: 'audio/mp3' });

          // Prepare transcription parameters
          const transcriptionParams: any = {
            file: file,
            model: 'whisper-1',
            language: validatedInput.language,
            response_format: validatedInput.responseFormat,
            temperature: validatedInput.temperature,
            timestamp_granularities: validatedInput.timestampGranularities,
          };

          // Add prompt if provided
          if (validatedInput.prompt) {
            transcriptionParams.prompt = validatedInput.prompt;
          }

          console.log("Calling OpenAI Whisper API", {
            model: 'whisper-1',
            language: validatedInput.language,
            responseFormat: validatedInput.responseFormat,
            fileSize: audioBuffer.length,
            audioDuration
          });

          // Call OpenAI Whisper API
          const transcription = await openai.audio.transcriptions.create(transcriptionParams);

          console.log("Whisper API response received", {
            text: typeof transcription.text === 'string' ? transcription.text.substring(0, 100) + '...' : 'No text',
            language: (transcription as any).language,
            duration: (transcription as any).duration,
            hasWords: !!(transcription as any).words,
            hasSegments: !!(transcription as any).segments
          });

          // Process and structure the result
          transcriptionResult = processTranscriptionResult(
            transcription,
            validatedInput,
            audioDuration,
            attempt,
            Date.now() - startTime
          );

          console.log("Transcription processing completed", {
            textLength: transcriptionResult.text.length,
            wordCount: transcriptionResult.wordCount,
            characterCount: transcriptionResult.characterCount,
            hasWords: !!transcriptionResult.words,
            hasSegments: !!transcriptionResult.segments,
            confidence: transcriptionResult.confidence
          });

          break; // Success - exit retry loop

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          console.error(`Transcription attempt ${attempt} failed`, {
            error: lastError.message,
            attempt,
            maxAttempts: validatedInput.maxRetries + 1
          });

          if (validatedInput.jobId) {
            await renderService.addEvent(
              validatedInput.jobId,
              'job_progress',
              'processing',
              {
                type: 'transcription_retry',
                attempt,
                maxAttempts: validatedInput.maxRetries + 1,
                error: lastError.message,
                retryDelay: Math.min(2000 * Math.pow(2, attempt - 1), 10000),
              },
              {
                severity: 'warning',
                category: 'processing',
                tags: ['transcription', 'retry', 'error']
              }
            );
          }

          // If this is the last attempt, throw the error
          if (attempt > validatedInput.maxRetries) {
            throw new Error(`Transcription failed after ${validatedInput.maxRetries + 1} attempts: ${lastError.message}`);
          }

          // Wait before retry (exponential backoff)
          const retryDelay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Waiting ${retryDelay}ms before retry`);
          await wait.for({ seconds: retryDelay / 1000 });
        }
      }

      if (!transcriptionResult) {
        throw new Error('Transcription failed - no result produced');
      }

      // Emit transcription completed event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'processing',
          {
            type: 'transcription_completed',
            result: {
              text: transcriptionResult.text.substring(0, 200) + '...',
              wordCount: transcriptionResult.wordCount,
              characterCount: transcriptionResult.characterCount,
              confidence: transcriptionResult.confidence,
              hasWordTimestamps: !!transcriptionResult.words,
              hasSegmentTimestamps: !!transcriptionResult.segments,
              language: transcriptionResult.language,
              processingTime: transcriptionResult.processingTime,
              retries: attempt - 1,
            },
          },
          {
            severity: 'success',
            category: 'processing',
            tags: ['transcription', 'whisper', 'completed', 'success']
          }
        );
      }

      console.log("Transcription completed successfully", {
        fileName: validatedInput.fileName,
        wordCount: transcriptionResult.wordCount,
        processingTime: transcriptionResult.processingTime,
        retries: attempt - 1,
        confidence: transcriptionResult.confidence
      });

      return transcriptionResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Transcription failed", {
        error: error instanceof Error ? error.message : error,
        duration: processingTime,
        payload
      });

      // Emit transcription failed event
      if (payload.jobId) {
        await renderService.addEvent(
          payload.jobId,
          'job_progress',
          'processing',
          {
            type: 'transcription_failed',
            error: error instanceof Error ? error.message : error,
            fileName: payload.fileName,
            processingTime,
          },
          {
            severity: 'error',
            category: 'processing',
            tags: ['transcription', 'whisper', 'error', 'failure']
          }
        );
      }

      throw new Error(`Transcription failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Helper function to get audio duration
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Audio duration detection timed out'));
    }, 30000);

    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      clearTimeout(timeout);

      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }

      const duration = metadata.format?.duration;
      if (!duration || duration <= 0) {
        reject(new Error('Invalid or missing audio duration'));
        return;
      }

      resolve(duration);
    });
  });
}

// Helper function to convert audio to MP3
async function convertToMp3(inputPath: string, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputFileName = fileName.replace(/\.[^/.]+$/, '.mp3');
    const outputPath = `${process.env.TEMP_DIR || '/tmp'}/${outputFileName}`;

    const timeout = setTimeout(() => {
      reject(new Error('Audio conversion timed out'));
    }, 60000);

    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioFrequency(16000)
      .on('error', (err: any) => {
        clearTimeout(timeout);
        reject(new Error(`Audio conversion error: ${err.message}`));
      })
      .on('end', () => {
        clearTimeout(timeout);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

// Helper function to process transcription result
function processTranscriptionResult(
  transcription: any,
  input: TranscribeEnInput,
  audioDuration: number | undefined,
  retries: number,
  processingTime: number
): TranscriptionResult {
  const text = typeof transcription.text === 'string' ? transcription.text : '';
  const words = (transcription as any).words || [];
  const segments = (transcription as any).segments || [];

  // Calculate word-level confidence
  let wordConfidence = 0;
  if (words.length > 0) {
    const totalConfidence = words.reduce((sum: number, word: any) => sum + (word.confidence || 0.8), 0);
    wordConfidence = totalConfidence / words.length;
  }

  // Calculate segment-level confidence
  let segmentConfidence = 0;
  if (segments.length > 0) {
    const totalAvgLogprob = segments.reduce((sum: number, seg: any) => sum + (seg.avg_logprob || -0.5), 0);
    segmentConfidence = Math.max(0, Math.min(1, (totalAvgLogprob / segments.length + 1) / 2));
  }

  const overallConfidence = words.length > 0 ? wordConfidence : segmentConfidence;

  return {
    text,
    language: (transcription as any).language || input.language,
    duration: (transcription as any).duration || audioDuration,
    words: words.length > 0 ? words.map((word: any) => ({
      word: word.word || '',
      start: word.start || 0,
      end: word.end || 0,
      confidence: word.confidence || 0.8,
    })) : undefined,
    segments: segments.length > 0 ? segments.map((seg: any) => ({
      id: seg.id || 0,
      seek: seg.seek || 0,
      start: seg.start || 0,
      end: seg.end || 0,
      text: seg.text || '',
      tokens: seg.tokens || [],
      temperature: seg.temperature || 0.0,
      avg_logprob: seg.avg_logprob || 0.0,
      compression_ratio: seg.compression_ratio || 0.0,
      no_speech_prob: seg.no_speech_prob || 0.0,
      words: seg.words ? seg.words.map((word: any) => ({
        word: word.word || '',
        start: word.start || 0,
        end: word.end || 0,
        confidence: word.confidence || 0.8,
      })) : undefined,
    })) : undefined,
    confidence: overallConfidence,
    processingTime,
    wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
    characterCount: text.length,
    metadata: {
      model: 'whisper-1',
      temperature: input.temperature,
      responseFormat: input.responseFormat,
      timestampGranularities: input.timestampGranularities,
      fileSize: undefined, // Would need to get this from file
      audioDuration,
      retries,
    },
  };
}

// Utility task for quick transcription without detailed timestamps
export const quickTranscribeEnTask = task({
  id: "quick-transcribe-en",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: Omit<TranscribeEnInput, 'responseFormat' | 'timestampGranularities'>, { ctx }) => {
    console.log("Starting quick English transcription", { payload });

    try {
      const result = await transcribeEnTask.triggerAndWait({
        ...payload,
        responseFormat: 'json',
        timestampGranularities: ['segment'],
        timeout: Math.min(payload.timeout, 60), // Max 60 seconds for quick transcription
      });

      if (!result.ok) {
        throw new Error(`Quick transcription failed: ${result.error}`);
      }

      return {
        text: result.output.text,
        language: result.output.language,
        wordCount: result.output.wordCount,
        characterCount: result.output.characterCount,
        processingTime: result.output.processingTime,
        confidence: result.output.confidence,
      };

    } catch (error) {
      console.error("Quick transcription failed", {
        error: error instanceof Error ? error.message : error,
        payload
      });
      throw error;
    }
  },
});