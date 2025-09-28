import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { OpenAI } from "openai";
import * as ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { renderService } from "../lib/services/render-service";
import { TranslationService, type TranslationServiceConfig } from "../lib/agents/translation-service";
import { languageConfigs } from "../lib/agents/language-configs";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic || "ffmpeg");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Caption generation error codes
export enum CaptionAgentError {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  TRANSLATION_FAILED = "TRANSLATION_FAILED",
  CAPTION_GENERATION_FAILED = "CAPTION_GENERATION_FAILED",
  LANGUAGE_NOT_SUPPORTED = "LANGUAGE_NOT_SUPPORTED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  API_ERROR = "API_ERROR"
}

// Input validation schema
export const CaptionAgentSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),

  // Language configuration
  targetLanguage: z.string().min(2, "Target language code is required").default("en"),
  sourceLanguage: z.string().min(2, "Source language code is required").default("en"),

  // Caption options
  captionFormat: z.enum(["srt", "vtt", "json"]).default("srt"),
  maxCaptionDuration: z.number().positive().min(1).max(10).default(5), // seconds
  minCaptionDuration: z.number().positive().min(0.5).max(3).default(1), // seconds
  maxCharactersPerCaption: z.number().positive().min(20).max(200).default(80),

  // Processing options
  enableTranslation: z.boolean().default(true),
  enableTimestamps: z.boolean().default(true),
  enableSpeakerDetection: z.boolean().default(false),

  // Retry and timeout configuration
  maxRetries: z.number().min(0).max(5).default(3),
  timeout: z.number().positive().min(30).max(600).default(300), // seconds

  // Context and styling
  context: z.string().optional(),
  style: z.enum(["formal", "informal", "neutral"]).default("neutral"),
  industry: z.string().optional(),

  // Translation options
  translationTemperature: z.number().min(0).max(1).default(0.3),
  translationMaxTokens: z.number().positive().min(100).max(2000).default(500),
});

export type CaptionAgentInput = z.infer<typeof CaptionAgentSchema>;

// Caption segment schema
export const CaptionSegmentSchema = z.object({
  id: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  translatedText: z.string().optional(),
  language: z.string(),
  confidence: z.number().min(0).max(1),
  speaker: z.string().optional(),
  duration: z.number(),
  wordCount: z.number(),
  characterCount: z.number(),
});

export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;

// Caption result schema
export const CaptionResultSchema = z.object({
  segments: z.array(CaptionSegmentSchema),
  originalLanguage: z.string(),
  targetLanguage: z.string(),
  captionFormat: z.string(),
  totalDuration: z.number(),
  totalSegments: z.number(),
  totalWords: z.number(),
  totalCharacters: z.number(),
  confidence: z.number(),
  processingTime: z.number(),
  metadata: z.object({
    transcriptionModel: z.string(),
    translationModel: z.string(),
    audioDuration: z.number(),
    translationEnabled: z.boolean(),
    speakerDetectionEnabled: z.boolean(),
    languageConfig: z.any(),
    validationResults: z.array(z.any()).optional(),
    fallbackUsed: z.boolean().optional(),
    translationStats: z.object({
      tokensUsed: z.number(),
      confidence: z.number(),
      processingTime: z.number()
    }).optional()
  }),
});

export type CaptionResult = z.infer<typeof CaptionResultSchema>;

/**
 * Caption Agent Task - Generates multi-language captions with AI-powered translation
 *
 * This task performs comprehensive caption generation with:
 * - Multi-language transcription using OpenAI Whisper
 * - AI-powered translation using existing translation agent
 * - Language-specific validation and prompt templates
 * - Configurable caption formatting and timing
 * - Cultural context and industry-specific terminology
 * - Comprehensive error handling and retry logic
 */
export const runCaptionAgent = task({
  id: "caption-agent",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: CaptionAgentInput, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting caption agent", { payload });

    try {
      // Validate input
      const validatedInput = CaptionAgentSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      // Step 1: Validate language support and get configuration
      const languageValidation = validateLanguageSupport(validatedInput);
      if (!languageValidation.isValid) {
        throw new Error(`Language validation failed: ${languageValidation.errors.join(', ')}`);
      }

      const sourceConfig = languageConfigs.find(config => config.code === validatedInput.sourceLanguage);
      const targetConfig = languageConfigs.find(config => config.code === validatedInput.targetLanguage);

      if (!sourceConfig || !targetConfig) {
        throw new Error(`Language configuration not found for source: ${validatedInput.sourceLanguage} or target: ${validatedInput.targetLanguage}`);
      }

      console.log("Language configurations loaded", {
        sourceLanguage: sourceConfig.name,
        targetLanguage: targetConfig.name,
        sourceDirection: sourceConfig.direction,
        targetDirection: targetConfig.direction
      });

      // Emit caption generation started event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'processing',
          {
            type: 'caption_generation_started',
            fileName: validatedInput.fileName,
            sourceLanguage: validatedInput.sourceLanguage,
            targetLanguage: validatedInput.targetLanguage,
            captionFormat: validatedInput.captionFormat,
            enableTranslation: validatedInput.enableTranslation,
            maxCaptionDuration: validatedInput.maxCaptionDuration,
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['caption', 'generation', 'started']
          }
        );
      }

      // Step 2: Process audio and perform transcription
      let transcriptionResult;
      let audioDuration;

      try {
        // Get audio duration
        audioDuration = await getAudioDuration(validatedInput.filePath);
        console.log("Audio duration extracted", { duration: audioDuration });

        // Perform transcription with source language
        transcriptionResult = await performTranscription(
          validatedInput,
          sourceConfig,
          audioDuration
        );

        console.log("Transcription completed", {
          textLength: transcriptionResult.text.length,
          wordCount: transcriptionResult.wordCount,
          segmentsCount: transcriptionResult.segments?.length || 0,
          confidence: transcriptionResult.confidence
        });

      } catch (error) {
        console.error("Transcription failed", {
          error: error instanceof Error ? error.message : error,
          sourceLanguage: validatedInput.sourceLanguage
        });

        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'processing',
            {
              type: 'transcription_failed',
              error: error instanceof Error ? error.message : error,
              sourceLanguage: validatedInput.sourceLanguage,
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'error',
              category: 'processing',
              tags: ['caption', 'transcription', 'error']
            }
          );
        }

        throw new Error(`Transcription failed: ${error instanceof Error ? error.message : error}`);
      }

      // Step 3: Generate caption segments
      let captionSegments = generateCaptionSegments(
        transcriptionResult,
        validatedInput,
        sourceConfig
      );

      console.log("Caption segments generated", {
        segmentCount: captionSegments.length,
        averageDuration: captionSegments.reduce((sum, seg) => sum + seg.duration, 0) / captionSegments.length
      });

      // Step 4: Translate captions if enabled
      let translationStats;
      let validationResults;

      if (validatedInput.enableTranslation && validatedInput.targetLanguage !== validatedInput.sourceLanguage) {
        try {
          const translationResult = await translateCaptions(
            captionSegments,
            validatedInput,
            targetConfig
          );

          captionSegments = translationResult.translatedSegments;
          translationStats = translationResult.stats;
          validationResults = translationResult.validationResults;

          console.log("Caption translation completed", {
            translatedSegments: captionSegments.length,
            averageConfidence: captionSegments.reduce((sum, seg) => sum + (seg.confidence || 0.8), 0) / captionSegments.length,
            tokensUsed: translationStats.tokensUsed
          });

        } catch (error) {
          console.error("Caption translation failed", {
            error: error instanceof Error ? error.message : error,
            targetLanguage: validatedInput.targetLanguage
          });

          if (validatedInput.jobId) {
            await renderService.addEvent(
              validatedInput.jobId,
              'job_progress',
              'processing',
              {
                type: 'translation_failed',
                error: error instanceof Error ? error.message : error,
                targetLanguage: validatedInput.targetLanguage,
                processingTime: Date.now() - startTime,
              },
              {
                severity: 'warning',
                category: 'processing',
                tags: ['caption', 'translation', 'error']
              }
            );
          }

          // Continue with original language captions if translation fails
          console.warn("Continuing with original language captions due to translation failure");
        }
      }

      // Step 5: Format output and generate final result
      const captionResult = formatCaptionResult(
        captionSegments,
        validatedInput,
        transcriptionResult,
        {
          audioDuration: audioDuration || 0,
          sourceConfig,
          targetConfig,
          translationStats,
          validationResults,
          processingTime: Date.now() - startTime
        }
      );

      console.log("Caption generation completed successfully", {
        totalSegments: captionResult.totalSegments,
        totalDuration: captionResult.totalDuration,
        confidence: captionResult.confidence,
        processingTime: captionResult.processingTime
      });

      // Emit caption generation completed event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'processing',
          {
            type: 'caption_generation_completed',
            result: {
              totalSegments: captionResult.totalSegments,
              totalDuration: captionResult.totalDuration,
              confidence: captionResult.confidence,
              language: captionResult.targetLanguage,
              captionFormat: captionResult.captionFormat,
              processingTime: captionResult.processingTime,
              translationEnabled: validatedInput.enableTranslation,
            },
          },
          {
            severity: 'success',
            category: 'processing',
            tags: ['caption', 'generation', 'completed', 'success']
          }
        );
      }

      return captionResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Caption agent failed", {
        error: error instanceof Error ? error.message : error,
        duration: processingTime,
        payload
      });

      // Emit caption generation failed event
      if (payload.jobId) {
        await renderService.addEvent(
          payload.jobId,
          'job_progress',
          'processing',
          {
            type: 'caption_generation_failed',
            error: error instanceof Error ? error.message : error,
            fileName: payload.fileName,
            processingTime,
          },
          {
            severity: 'error',
            category: 'processing',
            tags: ['caption', 'generation', 'error', 'failure']
          }
        );
      }

      throw new Error(`Caption generation failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Helper function to validate language support
function validateLanguageSupport(input: CaptionAgentInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const supportedLanguages = languageConfigs.map(config => config.code);

  if (!supportedLanguages.includes(input.sourceLanguage)) {
    errors.push(`Unsupported source language: ${input.sourceLanguage}. Supported: ${supportedLanguages.join(', ')}`);
  }

  if (!supportedLanguages.includes(input.targetLanguage)) {
    errors.push(`Unsupported target language: ${input.targetLanguage}. Supported: ${supportedLanguages.join(', ')}`);
  }

  // Check if caption format is compatible with target language direction
  const targetConfig = languageConfigs.find(config => config.code === input.targetLanguage);
  if (targetConfig && targetConfig.direction === 'rtl' && input.captionFormat === 'srt') {
    errors.push(`SRT format may not display correctly for RTL language: ${targetConfig.name}. Consider using VTT format.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to perform transcription
async function performTranscription(
  input: CaptionAgentInput,
  languageConfig: any,
  audioDuration: number
): Promise<any> {
  const startTime = Date.now();

  try {
    // Read audio file
    const fs = await import('fs/promises');
    const audioBuffer = await fs.readFile(input.filePath);

    // Create file for OpenAI API
    const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/mp3' });
    const file = new File([blob], input.fileName, { type: 'audio/mp3' });

    // Prepare transcription parameters
    const transcriptionParams: any = {
      file: file,
      model: 'whisper-1',
      language: input.sourceLanguage,
      response_format: 'verbose_json',
      temperature: 0.0,
      timestamp_granularities: ['word', 'segment'],
    };

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create(transcriptionParams);

    // Process transcription result
    const result = {
      text: transcription.text || '',
      language: (transcription as any).language || input.sourceLanguage,
      duration: (transcription as any).duration || audioDuration,
      words: (transcription as any).words || [],
      segments: (transcription as any).segments || [],
      confidence: calculateTranscriptionConfidence(transcription),
      wordCount: (transcription.text || '').split(/\s+/).filter((word: string) => word.length > 0).length,
      characterCount: (transcription.text || '').length,
      processingTime: Date.now() - startTime,
    };

    return result;

  } catch (error) {
    console.error("Transcription API call failed", {
      error: error instanceof Error ? error.message : error,
      language: input.sourceLanguage
    });
    throw error;
  }
}

// Helper function to calculate transcription confidence
function calculateTranscriptionConfidence(transcription: any): number {
  const words = (transcription as any).words || [];
  const segments = (transcription as any).segments || [];

  if (words.length > 0) {
    const totalConfidence = words.reduce((sum: number, word: any) => sum + (word.confidence || 0.8), 0);
    return totalConfidence / words.length;
  }

  if (segments.length > 0) {
    const totalAvgLogprob = segments.reduce((sum: number, seg: any) => sum + (seg.avg_logprob || -0.5), 0);
    return Math.max(0, Math.min(1, (totalAvgLogprob / segments.length + 1) / 2));
  }

  return 0.8; // Default confidence
}

// Helper function to generate caption segments
function generateCaptionSegments(
  transcription: any,
  input: CaptionAgentInput,
  languageConfig: any
): CaptionSegment[] {
  const segments: CaptionSegment[] = [];

  // Use segments if available, otherwise create from words
  const sourceSegments = transcription.segments || [];

  if (sourceSegments.length > 0) {
    // Process existing segments
    let currentSegment: any = null;
    let currentText = '';
    let currentWords: any[] = [];

    for (const segment of sourceSegments) {
      const segmentWords = segment.words || [];

      for (const word of segmentWords) {
        // Check if adding this word would exceed limits
        const potentialText = currentText + (currentText ? ' ' : '') + word.word;
        const potentialDuration = currentSegment ? (word.end - currentSegment.start) : 0;
        const wordCount = currentWords.length + 1;
        const charCount = potentialText.length;

        if (currentSegment && (
          potentialDuration > input.maxCaptionDuration ||
          charCount > input.maxCharactersPerCaption
        )) {
          // Finalize current segment
          if (currentText.trim()) {
            segments.push({
              id: segments.length + 1,
              start: currentSegment.start,
              end: currentWords[currentWords.length - 1].end,
              text: currentText.trim(),
              language: input.sourceLanguage,
              confidence: calculateSegmentConfidence(currentWords),
              duration: currentWords[currentWords.length - 1].end - currentSegment.start,
              wordCount: currentWords.length,
              characterCount: currentText.trim().length,
            });
          }

          // Start new segment
          currentSegment = word;
          currentText = word.word;
          currentWords = [word];
        } else {
          // Add to current segment
          if (!currentSegment) {
            currentSegment = word;
          }
          currentText = potentialText;
          currentWords.push(word);
        }
      }
    }

    // Add final segment
    if (currentText.trim()) {
      segments.push({
        id: segments.length + 1,
        start: currentSegment.start,
        end: currentWords[currentWords.length - 1].end,
        text: currentText.trim(),
        language: input.sourceLanguage,
        confidence: calculateSegmentConfidence(currentWords),
        duration: currentWords[currentWords.length - 1].end - currentSegment.start,
        wordCount: currentWords.length,
        characterCount: currentText.trim().length,
      });
    }
  } else {
    // Create segments from raw text
    const words = transcription.text.split(/\s+/).filter((word: string) => word.length > 0);
    const avgWordDuration = (transcription.duration || 0) / words.length;

    let currentSegment = {
      id: 1,
      start: 0,
      text: '',
      words: [] as string[]
    };

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const potentialText = currentSegment.text + (currentSegment.text ? ' ' : '') + word;

      if (potentialText.length > input.maxCharactersPerCaption || currentSegment.words.length >= 15) {
        // Finalize current segment
        if (currentSegment.text.trim()) {
          segments.push({
            id: currentSegment.id,
            start: currentSegment.start,
            end: currentSegment.start + (currentSegment.words.length * avgWordDuration),
            text: currentSegment.text.trim(),
            language: input.sourceLanguage,
            confidence: 0.8,
            duration: currentSegment.words.length * avgWordDuration,
            wordCount: currentSegment.words.length,
            characterCount: currentSegment.text.trim().length,
          });
        }

        // Start new segment
        currentSegment = {
          id: segments.length + 1,
          start: i * avgWordDuration,
          text: word,
          words: [word]
        };
      } else {
        currentSegment.text = potentialText;
        currentSegment.words.push(word);
      }
    }

    // Add final segment
    if (currentSegment.text.trim()) {
      segments.push({
        id: currentSegment.id,
        start: currentSegment.start,
        end: currentSegment.start + (currentSegment.words.length * avgWordDuration),
        text: currentSegment.text.trim(),
        language: input.sourceLanguage,
        confidence: 0.8,
        duration: currentSegment.words.length * avgWordDuration,
        wordCount: currentSegment.words.length,
        characterCount: currentSegment.text.trim().length,
      });
    }
  }

  return segments;
}

// Helper function to calculate segment confidence
function calculateSegmentConfidence(words: any[]): number {
  if (words.length === 0) return 0.8;

  const totalConfidence = words.reduce((sum, word) => sum + (word.confidence || 0.8), 0);
  return totalConfidence / words.length;
}

// Helper function to translate captions
async function translateCaptions(
  segments: CaptionSegment[],
  input: CaptionAgentInput,
  targetConfig: any
): Promise<{
  translatedSegments: CaptionSegment[];
  stats: {
    tokensUsed: number;
    confidence: number;
    processingTime: number;
  };
  validationResults: any[];
}> {
  const startTime = Date.now();

  // Initialize translation service
  const translationConfig: TranslationServiceConfig = {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4',
    temperature: input.translationTemperature,
    retryAttempts: input.maxRetries,
    enableValidation: true,
    enableFallback: true,
  };

  const translationService = new TranslationService(translationConfig);

  const translatedSegments: CaptionSegment[] = [];
  let totalTokensUsed = 0;
  let totalConfidence = 0;
  const allValidationResults: any[] = [];

  // Batch translate segments for efficiency
  const batchSize = 10; // Process 10 segments at a time
  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);

    try {
      const translationRequests = batch.map(segment => ({
        text: segment.text,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        context: input.context || 'Video caption',
        style: input.style,
        industry: input.industry,
        maxTokens: input.translationMaxTokens,
      }));

      const translationResults = await translationService.batchTranslate(translationRequests);

      // Process translation results
      for (let j = 0; j < batch.length; j++) {
        const originalSegment = batch[j];
        const translationResult = translationResults[j];

        translatedSegments.push({
          ...originalSegment,
          translatedText: translationResult.translatedText,
          confidence: (originalSegment.confidence + translationResult.confidence) / 2,
        });

        totalTokensUsed += translationResult.tokenUsage.total;
        totalConfidence += translationResult.confidence;

        if (translationResult.validationResults) {
          allValidationResults.push(...translationResult.validationResults);
        }
      }

    } catch (error) {
      console.error("Batch translation failed", {
        error: error instanceof Error ? error.message : error,
        batchStart: i,
        batchSize: batch.length
      });

      // If batch translation fails, try individual segments
      for (const segment of batch) {
        try {
          const result = await translationService.translate(
            segment.text,
            input.targetLanguage,
            {
              sourceLanguage: input.sourceLanguage,
              context: input.context || 'Video caption',
              style: input.style,
              industry: input.industry,
              maxTokens: input.translationMaxTokens,
            }
          );

          translatedSegments.push({
            ...segment,
            translatedText: result.translatedText,
            confidence: (segment.confidence + result.confidence) / 2,
          });

          totalTokensUsed += result.tokenUsage.total;
          totalConfidence += result.confidence;

          if (result.validationResults) {
            allValidationResults.push(...result.validationResults);
          }

        } catch (individualError) {
          console.warn("Individual segment translation failed, keeping original", {
            error: individualError instanceof Error ? individualError.message : individualError,
            segmentId: segment.id
          });

          translatedSegments.push(segment); // Keep original if translation fails
        }
      }
    }
  }

  const stats = {
    tokensUsed: totalTokensUsed,
    confidence: translatedSegments.length > 0 ? totalConfidence / translatedSegments.length : 0,
    processingTime: Date.now() - startTime,
  };

  return {
    translatedSegments,
    stats,
    validationResults: allValidationResults
  };
}

// Helper function to format final caption result
function formatCaptionResult(
  segments: CaptionSegment[],
  input: CaptionAgentInput,
  transcription: any,
  metadata: {
    audioDuration: number;
    sourceConfig: any;
    targetConfig: any;
    translationStats?: any;
    validationResults?: any[];
    processingTime: number;
  }
): CaptionResult {
  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
  const totalWords = segments.reduce((sum, seg) => sum + seg.wordCount, 0);
  const totalCharacters = segments.reduce((sum, seg) => sum + seg.characterCount, 0);
  const averageConfidence = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;

  return {
    segments,
    originalLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    captionFormat: input.captionFormat,
    totalDuration,
    totalSegments: segments.length,
    totalWords,
    totalCharacters,
    confidence: averageConfidence,
    processingTime: metadata.processingTime,
    metadata: {
      transcriptionModel: 'whisper-1',
      translationModel: 'gpt-4',
      audioDuration: metadata.audioDuration,
      translationEnabled: input.enableTranslation,
      speakerDetectionEnabled: input.enableSpeakerDetection,
      languageConfig: {
        source: {
          code: metadata.sourceConfig.code,
          name: metadata.sourceConfig.name,
          direction: metadata.sourceConfig.direction,
          formalLevel: metadata.sourceConfig.formalLevel,
          tokenLimit: metadata.sourceConfig.tokenLimit,
        },
        target: {
          code: metadata.targetConfig.code,
          name: metadata.targetConfig.name,
          direction: metadata.targetConfig.direction,
          formalLevel: metadata.targetConfig.formalLevel,
          tokenLimit: metadata.targetConfig.tokenLimit,
        }
      },
      validationResults: metadata.validationResults,
      fallbackUsed: segments.some(seg => !seg.translatedText && input.enableTranslation),
      translationStats: metadata.translationStats
    },
  };
}

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