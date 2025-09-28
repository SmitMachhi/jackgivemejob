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
    fontFamily: "NotoSans",
    fallbackFonts: ["Roboto", "Arial", "sans-serif"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  es: {
    fontFamily: "NotoSans",
    fallbackFonts: ["OpenSans", "Roboto", "Arial"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  fr: {
    fontFamily: "NotoSans",
    fallbackFonts: ["OpenSans", "Roboto", "Arial"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  de: {
    fontFamily: "NotoSans",
    fallbackFonts: ["SourceSansPro", "Roboto", "Arial"],
    fontSize: 24,
    fontColor: "white",
    backgroundColor: "black@0.7",
    outlineColor: "black@0.8",
    shadowColor: "black@0.5",
    position: { x: "(w-tw)/2", y: "h-th-20" }
  },
  vi: {
    fontFamily: "NotoSans",
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
          'processing',
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
            'processing',
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
            'processing',
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
            'processing',
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
              'processing',
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
              'processing',
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
          'processing',
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
          'processing',
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

// Helper function to process video with captions
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

    // Build FFmpeg command
    let command = ffmpeg(inputPath);

    // Add complex filter for captions
    const filters: string[] = [];

    // Generate subtitle file with font information
    const subtitleContent = generateSubtitleFile(captions, fontConfig);
    const subtitlePath = path.join(path.dirname(outputPath), 'captions.ass');

    // Write subtitle file
    fs.writeFile(subtitlePath, subtitleContent).then(() => {
      // Add subtitle filter
      filters.push(`subtitles=${subtitlePath}:force_style='Fontname=${fontConfig.fontFamily},Fontsize=${fontConfig.fontSize},PrimaryColour=${convertColor(fontConfig.fontColor)},OutlineColour=${convertColor(fontConfig.outlineColor)},BackColour=${convertColor(fontConfig.backgroundColor)}'`);

      // Add watermark if requested
      if (addWatermark && watermarkText) {
        filters.push(`drawtext=text='${watermarkText}':fontfile=/fonts/NotoSans-Regular.ttf:fontsize=16:fontcolor=white@0.5:x=10:y=10`);
      }

      // Apply filters
      command.videoFilters(filters.join(','));

      // Set quality options
      const qualityOptions = getQualityOptions(quality);
      command.outputOptions(qualityOptions);

      // Set audio codec if preserving audio
      if (preserveAudio) {
        command.audioCodec('aac');
      }

      // Handle output
      command
        .on('error', (err: any) => {
          clearTimeout(timeout);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .on('end', () => {
          clearTimeout(timeout);
          // Clean up subtitle file
          fs.unlink(subtitlePath).catch(() => {});
          resolve(outputPath);
        })
        .save(outputPath);
    }).catch(reject);
  });
}

// Helper function to generate subtitle file
function generateSubtitleFile(captions: CaptionSegment[], fontConfig: FontConfig): string {
  const lines = [
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${fontConfig.fontFamily},${fontConfig.fontSize},${convertColor(fontConfig.fontColor)},&H000000FF,${convertColor(fontConfig.outlineColor)},${convertColor(fontConfig.backgroundColor)},0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1`,
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ];

  captions.forEach(caption => {
    const start = formatTime(caption.startTime);
    const end = formatTime(caption.endTime);
    const text = caption.text.replace(/\n/g, '\\N');
    lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`);
  });

  return lines.join('\n');
}

// Helper function to convert color to ASS format
function convertColor(color: string): string {
  if (color.includes('@')) {
    const [baseColor, alpha] = color.split('@');
    const alphaValue = Math.round(parseFloat(alpha) * 255);
    return `&H${alphaValue.toString(16).padStart(2, '0')}${hexToBGR(baseColor)}`;
  }
  return `&HFF${hexToBGR(color)}`;
}

// Helper function to convert hex color to BGR format
function hexToBGR(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}`;
}

// Helper function to format time for subtitles
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cents = Math.floor((seconds % 1) * 100);

  return `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
}

// Helper function to get quality options
function getQualityOptions(quality: string): string[] {
  switch (quality) {
    case 'low':
      return ['-crf', '28', '-preset', 'fast', '-tune', 'fastdecode'];
    case 'medium':
      return ['-crf', '23', '-preset', 'medium'];
    case 'high':
      return ['-crf', '18', '-preset', 'slow', '-tune', 'film'];
    default:
      return ['-crf', '23', '-preset', 'medium'];
  }
}