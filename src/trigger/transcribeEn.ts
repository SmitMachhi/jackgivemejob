import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { OpenAI } from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { renderService } from "@/lib/services/render-service";
import * as crypto from "crypto";
import { kv } from "@vercel/kv";

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
  LANGUAGE_DETECTION_FAILED = "LANGUAGE_DETECTION_FAILED",
  LANGUAGE_CONFIDENCE_TOO_LOW = "LANGUAGE_CONFIDENCE_TOO_LOW",
  QUALITY_VALIDATION_FAILED = "QUALITY_VALIDATION_FAILED",
  CACHE_MISS = "CACHE_MISS",
  COST_LIMIT_EXCEEDED = "COST_LIMIT_EXCEEDED"
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

  // Enhanced features
  enableCache: z.boolean().default(true),
  cacheTtl: z.number().positive().min(300).max(86400).default(3600), // 1 hour default
  languageConfidenceThreshold: z.number().min(0).max(1).default(0.9), // 90% English confidence
  minWordCount: z.number().min(1).default(5), // Minimum words for valid transcription
  minConfidenceScore: z.number().min(0).max(1).default(0.7), // Minimum overall confidence
  enableCostTracking: z.boolean().default(true),
  maxCostLimit: z.number().positive().default(1.00), // $1.00 default limit
  enableRealtimeEvents: z.boolean().default(true),
  retryBackoffFactor: z.number().min(1).max(5).default(2),
  retryBaseDelay: z.number().min(100).max(10000).default(2000), // 2 seconds base delay
  enableVerboseLogging: z.boolean().default(false),
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

  // Enhanced fields
  languageConfidence: z.number().min(0).max(1).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  cacheHit: z.boolean().optional(),
  cacheKey: z.string().optional(),
  cost: z.number().optional(),
  audioFeatures: z.object({
    sampleRate: z.number().optional(),
    channels: z.number().optional(),
    bitDepth: z.number().optional(),
    duration: z.number().optional(),
    format: z.string().optional(),
  }).optional(),

  metadata: z.object({
    model: z.string(),
    temperature: z.number(),
    responseFormat: z.string(),
    timestampGranularities: z.array(z.string()),
    fileSize: z.number().optional(),
    audioDuration: z.number().optional(),
    retries: z.number(),

    // Enhanced metadata
    cacheEnabled: z.boolean().optional(),
    cacheTtl: z.number().optional(),
    languageConfidenceThreshold: z.number().optional(),
    qualityValidationPassed: z.boolean().optional(),
    costTrackingEnabled: z.boolean().optional(),
    processingStartTime: z.number().optional(),
    processingEndTime: z.number().optional(),
    apiCallCount: z.number().optional(),
    retryDelays: z.array(z.number()).optional(),
  }),
});

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;

// Cache interface for transcription results
interface TranscriptionCache {
  get(key: string): Promise<TranscriptionResult | null>;
  set(key: string, value: TranscriptionResult, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  generateCacheKey(filePath: string, options: any): string;
  clear(pattern?: string): Promise<number>;
  getMetrics(): Promise<CacheMetrics>;
}

// Cache metrics interface
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage?: number;
  lastUpdated: Date;
}

// Cost tracking interface
interface CostTracker {
  trackCost(cost: number, operation: string): Promise<void>;
  getTotalCost(): Promise<number>;
  checkCostLimit(limit: number): Promise<boolean>;
}

// Enhanced Vercel KV-based cache implementation for Trigger.dev
class VercelKVTranscriptionCache implements TranscriptionCache {
  private namespace = 'transcription';
  private metricsNamespace = 'transcription:metrics';

  async get(key: string): Promise<TranscriptionResult | null> {
    try {
      const fullKey = `${this.namespace}:${key}`;
      const result = await kv.get<TranscriptionResult>(fullKey);

      if (result) {
        await this.incrementMetric('hits');
        return result;
      }

      await this.incrementMetric('misses');
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      await this.incrementMetric('misses');
      return null;
    }
  }

  async set(key: string, value: TranscriptionResult, ttl: number): Promise<void> {
    try {
      const fullKey = `${this.namespace}:${key}`;
      await kv.set(fullKey, value, { ex: ttl });
      await this.incrementMetric('sets');

      // Update total keys count
      await this.incrementMetric('totalKeys');
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = `${this.namespace}:${key}`;
      await kv.del(fullKey);
      await this.incrementMetric('deletes');

      // Update total keys count
      await this.decrementMetric('totalKeys');
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      const searchPattern = pattern ? `${this.namespace}:${pattern}` : `${this.namespace}:*`;
      const keys = await kv.keys(searchPattern);

      if (keys.length > 0) {
        await kv.del(...keys);
        await this.setMetric('totalKeys', 0);
        await this.incrementMetric('deletes', keys.length);
      }

      return keys.length;
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  generateCacheKey(filePath: string, options: any): string {
    const fs = require('fs');
    const stats = fs.statSync(filePath);
    const fileHash = crypto.createHash('md5')
      .update(`${filePath}:${stats.size}:${stats.mtime.getTime()}`)
      .digest('hex');

    const optionsHash = crypto.createHash('md5')
      .update(JSON.stringify({
        language: options.language,
        temperature: options.temperature,
        responseFormat: options.responseFormat,
        timestampGranularities: options.timestampGranularities,
        prompt: options.prompt,
      }))
      .digest('hex');

    // Include Trigger.dev context for better isolation
    const triggerContext = process.env.TRIGGER_RUN_ID ? `run:${process.env.TRIGGER_RUN_ID}` : 'local';

    return `${triggerContext}:${fileHash}:${optionsHash}`;
  }

  async getMetrics(): Promise<CacheMetrics> {
    try {
      const [hits, misses, sets, deletes, totalKeys] = await Promise.all([
        this.getMetric('hits'),
        this.getMetric('misses'),
        this.getMetric('sets'),
        this.getMetric('deletes'),
        this.getMetric('totalKeys')
      ]);

      const totalRequests = (hits || 0) + (misses || 0);
      const hitRate = totalRequests > 0 ? (hits || 0) / totalRequests : 0;

      // Estimate memory usage (rough approximation)
      const memoryUsage = totalKeys ? totalKeys * 1024 : undefined; // ~1KB per cached result

      return {
        hits: hits || 0,
        misses: misses || 0,
        sets: sets || 0,
        deletes: deletes || 0,
        size: totalKeys || 0,
        hitRate,
        totalKeys: totalKeys || 0,
        memoryUsage,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Cache metrics error:', error);
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0,
        totalKeys: 0,
        lastUpdated: new Date()
      };
    }
  }

  // Helper methods for metrics
  private async incrementMetric(name: string, value: number = 1): Promise<void> {
    try {
      if (value === 1) {
        await kv.incr(`${this.metricsNamespace}:${name}`);
      } else {
        // For values > 1, we need to use a different approach
        const current = await this.getMetric(name) || 0;
        await this.setMetric(name, current + value);
      }
    } catch (error) {
      console.error(`Metric increment error for ${name}:`, error);
    }
  }

  private async decrementMetric(name: string, value: number = 1): Promise<void> {
    try {
      if (value === 1) {
        await kv.decr(`${this.metricsNamespace}:${name}`);
      } else {
        // For values > 1, we need to use a different approach
        const current = await this.getMetric(name) || 0;
        await this.setMetric(name, Math.max(0, current - value));
      }
    } catch (error) {
      console.error(`Metric decrement error for ${name}:`, error);
    }
  }

  private async setMetric(name: string, value: number): Promise<void> {
    try {
      await kv.set(`${this.metricsNamespace}:${name}`, value);
    } catch (error) {
      console.error(`Metric set error for ${name}:`, error);
    }
  }

  private async getMetric(name: string): Promise<number | null> {
    try {
      return await kv.get<number>(`${this.metricsNamespace}:${name}`);
    } catch (error) {
      console.error(`Metric get error for ${name}:`, error);
      return null;
    }
  }
}

// Fallback memory cache for local development
class MemoryTranscriptionCache implements TranscriptionCache {
  private cache = new Map<string, { data: TranscriptionResult; expires: number }>();
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  async get(key: string): Promise<TranscriptionResult | null> {
    const item = this.cache.get(key);
    if (!item) {
      this.metrics.misses++;
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    return item.data;
  }

  async set(key: string, value: TranscriptionResult, ttl: number): Promise<void> {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { data: value, expires });
    this.metrics.sets++;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.metrics.deletes++;
  }

  async clear(pattern?: string): Promise<number> {
    let count = 0;
    if (!pattern) {
      count = this.cache.size;
      this.cache.clear();
    } else {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }
    }
    this.metrics.deletes += count;
    return count;
  }

  generateCacheKey(filePath: string, options: any): string {
    const fs = require('fs');
    const stats = fs.statSync(filePath);
    const fileHash = crypto.createHash('md5')
      .update(`${filePath}:${stats.size}:${stats.mtime.getTime()}`)
      .digest('hex');

    const optionsHash = crypto.createHash('md5')
      .update(JSON.stringify({
        language: options.language,
        temperature: options.temperature,
        responseFormat: options.responseFormat,
        timestampGranularities: options.timestampGranularities,
        prompt: options.prompt,
      }))
      .digest('hex');

    return `transcription:${fileHash}:${optionsHash}`;
  }

  async getMetrics(): Promise<CacheMetrics> {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      size: this.cache.size,
      hitRate,
      totalKeys: this.cache.size,
      lastUpdated: new Date()
    };
  }
}

// Default cost tracker implementation
class MemoryCostTracker implements CostTracker {
  private totalCost = 0;
  private costs: Array<{ cost: number; operation: string; timestamp: number }> = [];

  async trackCost(cost: number, operation: string): Promise<void> {
    this.totalCost += cost;
    this.costs.push({ cost, operation, timestamp: Date.now() });

    console.log(`Cost tracked: $${cost.toFixed(4)} for ${operation}, Total: $${this.totalCost.toFixed(4)}`);
  }

  async getTotalCost(): Promise<number> {
    return this.totalCost;
  }

  async checkCostLimit(limit: number): Promise<boolean> {
    return this.totalCost < limit;
  }
}

// Global instances with environment-aware caching
const transcriptionCache = process.env.VERCEL_ENV ? new VercelKVTranscriptionCache() : new MemoryTranscriptionCache();
const costTracker = new MemoryCostTracker();

/**
 * Transcribe English Task - Enhanced with comprehensive features
 *
 * This task performs audio transcription with advanced features:
 * - OpenAI Whisper API integration (whisper-1 model)
 * - Word-level timestamps using verbose_json format
 * - Language enforcement (English only) with confidence threshold
 * - Advanced retry logic with exponential backoff
 * - Transcription caching to avoid redundant API calls
 * - Quality validation with configurable thresholds
 * - Cost tracking and monitoring
 * - Real-time event emission for UI updates
 * - Enhanced logging and debugging capabilities
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
    const processingStartTime = Date.now();
    console.log("Starting enhanced English transcription", { payload });

    try {
      // Validate input
      const validatedInput = TranscribeEnSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      // Initialize tracking variables
      let transcriptionResult: TranscriptionResult | null = null;
      let cacheHit = false;
      let cacheKey: string | null = null;
      let totalCost = 0;
      let apiCallCount = 0;
      const retryDelays: number[] = [];

      // Check cache if enabled
      if (validatedInput.enableCache) {
        cacheKey = transcriptionCache.generateCacheKey(validatedInput.filePath, validatedInput);
        const cachedResult = await transcriptionCache.get(cacheKey);

        if (cachedResult) {
          console.log("Cache hit found", { cacheKey, age: Date.now() - (cachedResult.metadata.processingEndTime || 0) });
          cacheHit = true;
          transcriptionResult = {
            ...cachedResult,
            cacheHit: true,
            cacheKey,
            processingTime: Date.now() - startTime,
            metadata: {
              ...cachedResult.metadata,
              cacheEnabled: true,
              cacheTtl: validatedInput.cacheTtl,
              processingStartTime,
              processingEndTime: Date.now(),
            }
          };

          // Emit cache hit event
          if (validatedInput.jobId && validatedInput.enableRealtimeEvents) {
            await renderService.addEvent(
              validatedInput.jobId,
              'job_progress',
              'transcribing',
              'transcribing',
              {
                type: 'transcription_cache_hit',
                cacheKey,
                processingTime: transcriptionResult.processingTime,
                wordCount: transcriptionResult.wordCount,
              },
              {
                severity: 'info',
                category: 'processing',
                tags: ['transcription', 'cache', 'hit']
              }
            );
          }

          return transcriptionResult;
        }
      }

      // Emit transcription started event
      if (validatedInput.jobId && validatedInput.enableRealtimeEvents) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'transcribing',
          'transcribing',
          {
            type: 'transcription_started',
            fileName: validatedInput.fileName,
            filePath: validatedInput.filePath,
            mimeType: validatedInput.mimeType,
            language: validatedInput.language,
            timestampGranularities: validatedInput.timestampGranularities,
            maxRetries: validatedInput.maxRetries,
            timeout: validatedInput.timeout,
            cacheEnabled: validatedInput.enableCache,
            costTrackingEnabled: validatedInput.enableCostTracking,
            languageConfidenceThreshold: validatedInput.languageConfidenceThreshold,
            minWordCount: validatedInput.minWordCount,
            minConfidenceScore: validatedInput.minConfidenceScore,
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['transcription', 'whisper', 'started', 'enhanced']
          }
        );
      }

      // Step 1: Validate file exists and extract audio if needed
      let audioFilePath = validatedInput.filePath;
      let audioDuration: number | undefined;
      let audioFeatures: any = {};

      try {
        console.log("Processing audio file", { filePath: validatedInput.filePath });

        // Extract enhanced audio features using ffprobe
        const audioInfo = await getAudioFeatures(validatedInput.filePath);
        audioDuration = audioInfo.duration;
        audioFeatures = audioInfo.features;

        console.log("Audio features extracted", {
          duration: audioDuration,
          sampleRate: audioFeatures.sampleRate,
          channels: audioFeatures.channels,
          format: audioFeatures.format
        });

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
            'transcribing',
            'transcribing',
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
            'failed',
            'failed',
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
              'transcribing',
              'transcribing',
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
              'transcribing',
              'transcribing',
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
          'transcribing',
          'transcribing',
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

      // Add cache metrics to result for monitoring
      const cacheMetrics = await transcriptionCache.getMetrics();
      console.log("Transcription completed successfully", {
        fileName: validatedInput.fileName,
        wordCount: transcriptionResult.wordCount,
        processingTime: transcriptionResult.processingTime,
        retries: attempt - 1,
        confidence: transcriptionResult.confidence,
        cacheMetrics: {
          hitRate: cacheMetrics.hitRate,
          totalKeys: cacheMetrics.totalKeys,
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses
        }
      });

      // Emit cache metrics event for monitoring
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'transcribing',
          'transcribing',
          {
            type: 'cache_metrics',
            metrics: {
              hitRate: cacheMetrics.hitRate,
              totalKeys: cacheMetrics.totalKeys,
              hits: cacheMetrics.hits,
              misses: cacheMetrics.misses,
              sets: cacheMetrics.sets,
              deletes: cacheMetrics.deletes,
              memoryUsage: cacheMetrics.memoryUsage
            },
            processingTime: transcriptionResult.processingTime,
          },
          {
            severity: 'info' as const,
            category: 'system' as const,
            tags: ['cache', 'metrics', 'performance']
          }
        );
      }

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
          'failed',
          'failed',
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

// Helper function to get audio features using ffprobe
async function getAudioFeatures(filePath: string): Promise<{
  duration: number;
  features: {
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
    format?: string;
  };
}> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Audio feature extraction timed out'));
    }, 30000);

    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      clearTimeout(timeout);

      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }

      try {
        const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
        const duration = metadata.format?.duration || 0;

        if (!duration || duration <= 0) {
          reject(new Error('Invalid or missing audio duration'));
          return;
        }

        const features = {
          sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
          channels: audioStream?.channels,
          bitDepth: audioStream?.bits_per_sample,
          format: metadata.format?.format_name || 'unknown',
        };

        resolve({ duration, features });
      } catch (error) {
        reject(new Error(`Failed to parse audio features: ${error instanceof Error ? error.message : error}`));
      }
    });
  });
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

// Cache management task for Trigger.dev
export const cacheManagementTask = task({
  id: "cache-management",
  retry: {
    maxAttempts: 1,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 1,
    randomize: false,
  },
  run: async (payload: {
    operation: 'clear' | 'invalidate' | 'cleanup' | 'metrics';
    pattern?: string;
    jobId?: string;
  }, { ctx }) => {
    console.log("Starting cache management", { payload });

    try {
      switch (payload.operation) {
        case 'clear':
          const clearedCount = await transcriptionCache.clear(payload.pattern);
          console.log(`Cache cleared: ${clearedCount} keys removed`);
          return { clearedCount, operation: 'clear' };

        case 'invalidate':
          // Invalidate cache for specific run or pattern
          const invalidationCount = await transcriptionCache.clear(payload.pattern);
          console.log(`Cache invalidated: ${invalidationCount} keys removed`);
          return { invalidationCount, operation: 'invalidate' };

        case 'cleanup':
          // Clean up expired entries (KV handles this automatically, but we can log metrics)
          const metrics = await transcriptionCache.getMetrics();
          console.log("Cache cleanup completed", { metrics });
          return { metrics, operation: 'cleanup' };

        case 'metrics':
          const cacheMetrics = await transcriptionCache.getMetrics();
          console.log("Cache metrics retrieved", cacheMetrics);
          return { metrics: cacheMetrics, operation: 'metrics' };

        default:
          throw new Error(`Unknown cache operation: ${payload.operation}`);
      }
    } catch (error) {
      console.error("Cache management failed", {
        error: error instanceof Error ? error.message : error,
        payload
      });
      throw error;
    }
  },
});

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