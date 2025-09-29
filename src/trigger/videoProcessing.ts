import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { renderService } from "@/lib/services/render-service";
import { fontManager } from "@/lib/fonts/font-manager";
import * as fs from "fs/promises";
import * as path from "path";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic || "ffmpeg");

// Font integration configuration
interface FontConfig {
  fontFamily: string;
  fallbackFonts: string[];
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  outlineColor: string;
  shadowColor: string;
  position: {
    x: string;
    y: string;
  };
  rtl?: boolean;
  complexScript?: boolean;
}

// Language-specific font configurations
const FONT_CONFIGS: Record<string, FontConfig> = {
  en: {
    fontFamily: "NotoSans-Regular",
    fallbackFonts: ["Roboto", "Arial", "sans-serif"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  es: {
    fontFamily: "NotoSans-Regular",
    fallbackFonts: ["OpenSans", "Roboto", "Arial"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  fr: {
    fontFamily: "NotoSans-Regular",
    fallbackFonts: ["OpenSans", "Roboto", "Arial"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  hi: {
    fontFamily: "NotoSansDevanagari-Regular",
    fallbackFonts: ["NotoSans-Regular", "Arial", "sans-serif"],
    fontSize: 26,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" },
    complexScript: true
  },
  vi: {
    fontFamily: "NotoSans-Regular",
    fallbackFonts: ["OpenSans", "Roboto", "Arial"],
    fontSize: 22,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  ar: {
    fontFamily: "NotoSansArabic",
    fallbackFonts: ["NotoSans", "Tahoma", "Arial"],
    fontSize: 26,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" },
    rtl: true
  },
  ja: {
    fontFamily: "NotoSansJP",
    fallbackFonts: ["NotoSans", "HiraginoSans", "YuGothic"],
    fontSize: 28,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" },
    complexScript: true
  },
  ko: {
    fontFamily: "NotoSansKR",
    fallbackFonts: ["NotoSans", "MalgunGothic", "Batang"],
    fontSize: 28,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" },
    complexScript: true
  },
  zh: {
    fontFamily: "NotoSansSC",
    fallbackFonts: ["NotoSans", "MicrosoftYaHei", "SimSun"],
    fontSize: 28,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" },
    complexScript: true
  },
  ru: {
    fontFamily: "NotoSans",
    fallbackFonts: ["Roboto", "OpenSans", "Arial"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  }
};

// Caption segment schema
export const CaptionSegmentSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  language: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;

// Video processing error codes
export enum VideoProcessingError {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  FONT_LOADING_FAILED = "FONT_LOADING_FAILED",
  CAPTION_RENDERING_FAILED = "CAPTION_RENDERING_FAILED",
  FFMPEG_ERROR = "FFMPEG_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  INVALID_CAPTIONS = "INVALID_CAPTIONS",
  LANGUAGE_NOT_SUPPORTED = "LANGUAGE_NOT_SUPPORTED"
}

// Input validation schema
export const VideoProcessingSchema = z.object({
  inputVideoPath: z.string().min(1, "Input video path is required"),
  outputVideoPath: z.string().min(1, "Output video path is required"),
  captions: z.array(CaptionSegmentSchema).min(1, "At least one caption segment is required"),
  targetLanguage: z.string().min(2, "Target language code is required").max(5),
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),
  fontConfig: z.object({
    fontFamily: z.string().optional(),
    fontSize: z.number().min(8).max(72).default(24),
    fontColor: z.string().default("white"),
    backgroundColor: z.string().default("black@0.7"),
    outlineColor: z.string().default("black@0.8"),
    shadowColor: z.string().default("black@0.5"),
    position: z.object({
      x: z.string().default("(w-tw)/2"),
      y: z.string().default("h-th-20")
    }).default({})
  }).optional().default({}),
  maxRetries: z.number().min(0).max(5).default(3),
  timeout: z.number().positive().min(30).max(600).default(300), // seconds
  quality: z.enum(["low", "medium", "high"]).default("medium"),
  preserveAudio: z.boolean().default(true),
  addWatermark: z.boolean().default(false),
  watermarkText: z.string().optional(),
});

export type VideoProcessingInput = z.infer<typeof VideoProcessingSchema>;

// Output schema
export const VideoProcessingOutputSchema = z.object({
  outputVideoPath: z.string(),
  fileSize: z.number(),
  processingTime: z.number(),
  captionsProcessed: z.number(),
  fontUsed: z.string(),
  fontFallbackChain: z.array(z.string()),
  resolution: z.object({
    width: z.number(),
    height: z.number()
  }),
  duration: z.number(),
  metadata: z.object({
    inputVideo: z.string(),
    outputVideo: z.string(),
    language: z.string(),
    quality: z.string(),
    fontConfig: z.record(z.any()),
    processingStats: z.object({
      totalSegments: z.number(),
      successfulSegments: z.number(),
      failedSegments: z.number(),
      averageConfidence: z.number().optional(),
      retries: z.number()
    })
  })
});

export type VideoProcessingOutput = z.infer<typeof VideoProcessingOutputSchema>;

/**
 * Video Processing with Font Integration Task
 *
 * This task processes videos by adding multi-language captions with intelligent font selection:
 * - Language-specific font selection and fallback handling
 * - Font Manager integration for optimal font choices
 * - Multi-language text rendering support (including RTL and complex scripts)
 * - FFmpeg integration with custom font rendering
 * - Comprehensive error handling and retry logic
 */
export const videoProcessingTask = task({
  id: "video-processing-with-fonts",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: VideoProcessingInput, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting video processing with font integration", { payload });

    try {
      // Validate input
      const validatedInput = VideoProcessingSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      // Validate language support
      if (!FONT_CONFIGS[validatedInput.targetLanguage as keyof typeof FONT_CONFIGS]) {
        throw new Error(`Language ${validatedInput.targetLanguage} is not supported for video processing`);
      }

      // Emit processing started event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'rendering',
          'rendering',
          {
            type: 'video_processing_started',
            inputVideo: validatedInput.inputVideoPath,
            outputVideo: validatedInput.outputVideoPath,
            targetLanguage: validatedInput.targetLanguage,
            captionsCount: validatedInput.captions.length,
            quality: validatedInput.quality,
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['video_processing', 'fonts', 'started']
          }
        );
      }

      // Step 1: Get optimal font configuration using Font Manager
      let fontConfig: FontConfig;
      let fontResponse;

      try {
        console.log("Selecting optimal font for language", {
          targetLanguage: validatedInput.targetLanguage,
          captionsSample: validatedInput.captions.slice(0, 3).map(c => c.text).join(' ')
        });

        // Use Font Manager to get optimal font
        const sampleText = validatedInput.captions.map(c => c.text).join(' ');
        fontResponse = await fontManager.getOptimalFont({
          text: sampleText,
          targetLanguage: validatedInput.targetLanguage,
          style: 'normal',
          weight: 400,
          fallbackEnabled: true
        });

        console.log("Font Manager response received", {
          fontFamily: fontResponse.fontFamily,
          fallbackFonts: fontResponse.fallbackFonts,
          characterCoverage: fontResponse.characterCoverage.percentage.toFixed(1) + '%'
        });

        // Merge with base configuration
        const baseConfig = FONT_CONFIGS[validatedInput.targetLanguage];
        fontConfig = {
          ...baseConfig,
          fontFamily: fontResponse.fontFamily,
          fallbackFonts: fontResponse.fallbackFonts,
          fontSize: validatedInput.fontConfig.fontSize || baseConfig.fontSize,
          fontColor: validatedInput.fontConfig.fontColor || baseConfig.fontColor,
          backgroundColor: validatedInput.fontConfig.backgroundColor || baseConfig.backgroundColor,
          outlineColor: validatedInput.fontConfig.outlineColor || baseConfig.outlineColor,
          shadowColor: validatedInput.fontConfig.shadowColor || baseConfig.shadowColor,
          position: validatedInput.fontConfig.position || baseConfig.position
        };

        // Emit font selection completed event
        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'rendering',
            'rendering',
            {
              type: 'font_selection_completed',
              fontFamily: fontConfig.fontFamily,
              fallbackFonts: fontConfig.fallbackFonts,
              characterCoverage: fontResponse.characterCoverage.percentage,
              missingCharacters: fontResponse.characterCoverage.missingCharacters.length,
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'success',
              category: 'processing',
              tags: ['font_selection', 'font_manager', 'completed']
            }
          );
        }

      } catch (fontError) {
        console.error("Font selection failed, using fallback", {
          error: fontError instanceof Error ? fontError.message : fontError,
          targetLanguage: validatedInput.targetLanguage
        });

        // Fallback to basic configuration
        fontConfig = FONT_CONFIGS[validatedInput.targetLanguage as keyof typeof FONT_CONFIGS];
        fontResponse = {
          fontFamily: fontConfig.fontFamily,
          fallbackFonts: fontConfig.fallbackFonts,
          characterCoverage: { percentage: 95, missingCharacters: [] },
          warnings: [fontError instanceof Error ? fontError.message : String(fontError)]
        };

        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'rendering',
            'rendering',
            {
              type: 'font_selection_failed',
              error: fontError instanceof Error ? fontError.message : fontError,
              fallbackFont: fontConfig.fontFamily,
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'warning',
              category: 'processing',
              tags: ['font_selection', 'fallback', 'error']
            }
          );
        }
      }

      // Step 2: Validate input video and get metadata
      let videoMetadata;
      try {
        videoMetadata = await getVideoMetadata(validatedInput.inputVideoPath);
        console.log("Video metadata retrieved", {
          resolution: videoMetadata.resolution,
          duration: videoMetadata.duration,
          format: videoMetadata.format
        });

      } catch (error) {
        console.error("Video metadata extraction failed", {
          error: error instanceof Error ? error.message : error,
          inputPath: validatedInput.inputVideoPath
        });

        if (validatedInput.jobId) {
          await renderService.addEvent(
            validatedInput.jobId,
            'job_progress',
            'rendering',
            'rendering',
            {
              type: 'video_metadata_failed',
              error: error instanceof Error ? error.message : error,
              inputPath: validatedInput.inputVideoPath,
              processingTime: Date.now() - startTime,
            },
            {
              severity: 'error',
              category: 'processing',
              tags: ['video_metadata', 'error', 'failure']
            }
          );
        }

        throw new Error(`Video metadata extraction failed: ${error instanceof Error ? error.message : error}`);
      }

      // Step 3: Process video with captions
      let processedVideoPath;
      let attempt = 0;

      while (attempt <= validatedInput.maxRetries) {
        attempt++;

        try {
          console.log(`Video processing attempt ${attempt}/${validatedInput.maxRetries + 1}`, {
            inputPath: validatedInput.inputVideoPath,
            outputPath: validatedInput.outputVideoPath,
            targetLanguage: validatedInput.targetLanguage,
            fontConfig: fontConfig.fontFamily
          });

          if (validatedInput.jobId) {
            await renderService.addEvent(
              validatedInput.jobId,
              'job_progress',
              'rendering',
              'rendering',
              {
                type: 'video_processing_attempt',
                attempt,
                maxAttempts: validatedInput.maxRetries + 1,
                fontUsed: fontConfig.fontFamily,
                captionsCount: validatedInput.captions.length,
              },
              {
                severity: 'info',
                category: 'processing',
                tags: ['video_processing', 'attempt', 'ffmpeg']
              }
            );
          }

          // Process video with FFmpeg and font integration
          processedVideoPath = await processVideoWithCaptions(
            validatedInput.inputVideoPath,
            validatedInput.outputVideoPath,
            validatedInput.captions,
            fontConfig,
            validatedInput.quality,
            validatedInput.preserveAudio,
            validatedInput.addWatermark,
            validatedInput.watermarkText
          );

          console.log("Video processing completed", {
            outputPath: processedVideoPath,
            processingTime: Date.now() - startTime
          });

          break; // Success - exit retry loop

        } catch (error) {
          const processingError = error instanceof Error ? error : new Error(String(error));

          console.error(`Video processing attempt ${attempt} failed`, {
            error: processingError.message,
            attempt,
            maxAttempts: validatedInput.maxRetries + 1
          });

          if (validatedInput.jobId) {
            await renderService.addEvent(
              validatedInput.jobId,
              'job_progress',
              'rendering',
              'rendering',
              {
                type: 'video_processing_retry',
                attempt,
                maxAttempts: validatedInput.maxRetries + 1,
                error: processingError.message,
                retryDelay: Math.min(3000 * Math.pow(2, attempt - 1), 15000),
              },
              {
                severity: 'warning',
                category: 'processing',
                tags: ['video_processing', 'retry', 'error']
              }
            );
          }

          // If this is the last attempt, throw the error
          if (attempt > validatedInput.maxRetries) {
            throw new Error(`Video processing failed after ${validatedInput.maxRetries + 1} attempts: ${processingError.message}`);
          }

          // Wait before retry (exponential backoff)
          const retryDelay = Math.min(3000 * Math.pow(2, attempt - 1), 15000);
          console.log(`Waiting ${retryDelay}ms before retry`);
          await wait.for({ seconds: retryDelay / 1000 });
        }
      }

      if (!processedVideoPath) {
        throw new Error('Video processing failed - no output produced');
      }

      // Step 4: Get output video metadata
      let outputMetadata;
      let outputFileSize = 0;

      try {
        outputMetadata = await getVideoMetadata(processedVideoPath);
        const stats = await fs.stat(processedVideoPath);
        outputFileSize = stats.size;

        console.log("Output video metadata", {
          resolution: outputMetadata.resolution,
          duration: outputMetadata.duration,
          fileSize: outputFileSize
        });

      } catch (error) {
        console.error("Output video metadata extraction failed", {
          error: error instanceof Error ? error.message : error,
          outputPath: processedVideoPath
        });
      }

      // Calculate processing statistics
      const processingTime = Date.now() - startTime;
      const avgConfidence = validatedInput.captions.reduce((sum, cap) => sum + (cap.confidence || 0.8), 0) / validatedInput.captions.length;

      const result: VideoProcessingOutput = {
        outputVideoPath: processedVideoPath,
        fileSize: outputFileSize,
        processingTime,
        captionsProcessed: validatedInput.captions.length,
        fontUsed: fontConfig.fontFamily,
        fontFallbackChain: fontConfig.fallbackFonts,
        resolution: outputMetadata?.resolution || { width: 0, height: 0 },
        duration: outputMetadata?.duration || 0,
        metadata: {
          inputVideo: validatedInput.inputVideoPath,
          outputVideo: processedVideoPath,
          language: validatedInput.targetLanguage,
          quality: validatedInput.quality,
          fontConfig: fontConfig,
          processingStats: {
            totalSegments: validatedInput.captions.length,
            successfulSegments: validatedInput.captions.length,
            failedSegments: 0,
            averageConfidence: avgConfidence,
            retries: attempt - 1
          }
        }
      };

      // Emit processing completed event
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'rendering',
          'rendering',
          {
            type: 'video_processing_completed',
            result: {
              outputPath: processedVideoPath,
              fileSize: outputFileSize,
              processingTime,
              captionsProcessed: validatedInput.captions.length,
              fontUsed: fontConfig.fontFamily,
              resolution: outputMetadata?.resolution,
              averageConfidence: avgConfidence,
              retries: attempt - 1
            },
          },
          {
            severity: 'success',
            category: 'processing',
            tags: ['video_processing', 'fonts', 'completed', 'success']
          }
        );
      }

      console.log("Video processing completed successfully", {
        outputPath: processedVideoPath,
        fileSize: outputFileSize,
        processingTime,
        fontUsed: fontConfig.fontFamily,
        captionsProcessed: validatedInput.captions.length
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Video processing failed", {
        error: error instanceof Error ? error.message : error,
        duration: processingTime,
        payload
      });

      // Emit processing failed event
      if (payload.jobId) {
        await renderService.addEvent(
          payload.jobId,
          'job_progress',
          'failed',
          'failed',
          {
            type: 'video_processing_failed',
            error: error instanceof Error ? error.message : error,
            inputPath: payload.inputVideoPath,
            targetLanguage: payload.targetLanguage,
            processingTime,
          },
          {
            severity: 'error',
            category: 'processing',
            tags: ['video_processing', 'fonts', 'error', 'failure']
          }
        );
      }

      throw new Error(`Video processing failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Helper function to get video metadata
async function getVideoMetadata(filePath: string): Promise<{
  resolution: { width: number; height: number };
  duration: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Video metadata extraction timed out'));
    }, 30000);

    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      clearTimeout(timeout);

      if (err) {
        reject(new Error(`FFprobe error: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams?.find((stream: any) => stream.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const width = videoStream.width || 0;
      const height = videoStream.height || 0;
      const duration = parseFloat(metadata.format?.duration) || 0;
      const format = metadata.format?.format_name || 'unknown';

      resolve({
        resolution: { width, height },
        duration,
        format
      });
    });
  });
}

// Helper function to process video with captions using FFmpeg drawtext
async function processVideoWithCaptions(
  inputPath: string,
  outputPath: string,
  captions: CaptionSegment[],
  fontConfig: FontConfig,
  quality: string,
  preserveAudio: boolean,
  addWatermark: boolean,
  watermarkText?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Video processing timed out'));
    }, 600000); // 10 minutes timeout

    // Validate input file exists
    fs.access(inputPath).catch(() => {
      clearTimeout(timeout);
      reject(new Error(`Input video file not found: ${inputPath}`));
      return;
    });

    // Build FFmpeg command
    let command = ffmpeg(inputPath);

    try {
      // Add complex filter for captions using drawtext
      const filters: string[] = [];

      // Process captions with language-specific rendering
      const captionFilters = captions.map((caption, index) => {
        const escapedText = escapeFFmpegText(caption.text);
        const safeArea = calculateSafeArea(fontConfig, escapedText);

        // Draw background box
        const drawboxFilter = `drawbox=x=${safeArea.x}:y=${safeArea.y}:w=${safeArea.width}:h=${safeArea.height}:color=${fontConfig.backgroundColor}:t=max`;

        // Draw text with font-specific settings
        const drawtextFilter = `drawtext=text='${escapedText}':fontfile=/fonts/${fontConfig.fontFamily}.ttf:fontsize=${fontConfig.fontSize}:fontcolor=${fontConfig.fontColor}:x=${safeArea.textX}:y=${safeArea.textY}:enable='between(t,${caption.startTime},${caption.endTime})'`;

        // Add outline if specified
        let finalFilter = `${drawboxFilter},${drawtextFilter}`;
        if (fontConfig.outlineColor && fontConfig.outlineColor !== 'none') {
          finalFilter += `,drawtext=text='${escapedText}':fontfile=/fonts/${fontConfig.fontFamily}.ttf:fontsize=${fontConfig.fontSize}:fontcolor=${fontConfig.outlineColor}:x=${safeArea.textX + 1}:y=${safeArea.textY + 1}:enable='between(t,${caption.startTime},${caption.endTime})'`;
        }

        return finalFilter;
      });

      // Add caption filters
      filters.push(...captionFilters);

      // Add watermark if requested
      if (addWatermark && watermarkText) {
        filters.push(`drawtext=text='${escapeFFmpegText(watermarkText)}':fontfile=/fonts/NotoSans-Regular.ttf:fontsize=16:fontcolor=white@0.5:x=10:y=10`);
      }

      // Apply filters
      command.videoFilters(filters.join(','));

      // Set encoding options
      const encodingOptions = getEncodingOptions(quality, preserveAudio);
      command.outputOptions(encodingOptions);

    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`Failed to build FFmpeg command: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return;
    }

    // Handle output with enhanced error handling
    command
      .on('start', (commandLine: string) => {
        console.log('FFmpeg command started:', commandLine);
      })
      .on('progress', (progress: any) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('error', (err: any) => {
        clearTimeout(timeout);

        // Enhanced error handling
        let errorMessage = `FFmpeg error: ${err.message}`;

        // Check for specific FFmpeg errors
        if (err.message.includes('Permission denied')) {
          errorMessage = 'Permission denied - check file permissions';
        } else if (err.message.includes('No such file')) {
          errorMessage = 'Font file not found - check font paths';
        } else if (err.message.includes('Invalid data')) {
          errorMessage = 'Invalid video data - check input file format';
        } else if (err.message.includes('Encoder')) {
          errorMessage = 'Encoder error - check codec support';
        }

        console.error('FFmpeg processing failed:', errorMessage);
        reject(new Error(errorMessage));
      })
      .on('end', () => {
        clearTimeout(timeout);

        // Verify output file exists and has content
        fs.access(outputPath)
          .then(() => fs.stat(outputPath))
          .then(stats => {
            if (stats.size === 0) {
              reject(new Error('Output file is empty - processing failed'));
            } else {
              console.log(`Video processing completed successfully. Output size: ${stats.size} bytes`);
              resolve(outputPath);
            }
          })
          .catch(err => {
            reject(new Error(`Output file verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
          });
      })
      .save(outputPath);
  });
}

// Helper function to calculate safe area for text
function calculateSafeArea(fontConfig: FontConfig, text: string): {
  x: string;
  y: string;
  width: string;
  height: string;
  textX: string;
  textY: string;
} {
  // Estimate text dimensions based on font size and character count
  const charWidth = fontConfig.fontSize * 0.6; // Approximate character width
  const charHeight = fontConfig.fontSize * 1.2; // Line height
  const textWidth = Math.max(text.length * charWidth, 200); // Minimum width
  const textHeight = charHeight;

  // Calculate padding based on language complexity
  const padding = fontConfig.complexScript ? 20 : 10;

  // Position based on language and text direction
  let x, y;
  if (fontConfig.rtl) {
    // Right-to-left languages
    x = `w-${textWidth + padding}`;
  } else {
    // Left-to-right languages (centered)
    x = `(w-${textWidth})/2`;
  }

  // Vertical positioning (bottom with safe area)
  y = `h-${textHeight + padding * 2}`;

  // Text position within the box
  const textX = fontConfig.rtl ? `w-${textWidth + padding/2}` : `(w-${textWidth})/2`;
  const textY = `h-${textHeight + padding}`;

  return {
    x,
    y,
    width: `${textWidth + padding * 2}`,
    height: `${textHeight + padding * 2}`,
    textX,
    textY
  };
}

// Helper function to escape text for FFmpeg
function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\\\\\')  // Escape backslashes
    .replace(/'/g, "\\\\'")          // Escape single quotes
    .replace(/:/g, '\\:')                // Escape colons
    .replace(/\n/g, '\\\\n')           // Escape newlines
    .replace(/\r/g, '\\\\r')           // Escape carriage returns
    .replace(/\t/g, '\\\\t')           // Escape tabs
    .replace(/%/g, '\\\\%')             // Escape percent signs
    .replace(/\[/g, '\\\\[')           // Escape brackets
    .replace(/\]/g, '\\\\]')           // Escape brackets
    .replace(/\{/g, '\\\\{')           // Escape braces
    .replace(/\}/g, '\\\\}')           // Escape braces
    .trim();
}

// Helper function to get encoding options
function getEncodingOptions(quality: string, preserveAudio: boolean): string[] {
  const videoOptions = [
    '-c:v', 'libx264',
    '-crf', '23',
    '-preset', 'medium',
    '-movflags', '+faststart'
  ];

  const audioOptions = preserveAudio ? [
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100'
  ] : ['-an'];

  return [...videoOptions, ...audioOptions];
}

// Helper function to get quality options (legacy support)
function getQualityOptions(quality: string): string[] {
  return getEncodingOptions(quality, true);
}