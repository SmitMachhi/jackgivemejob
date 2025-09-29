import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import OpenAI from 'openai';
import { z } from 'zod';
import { LanguageSpecificValidators } from './language-validators';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic || "ffmpeg");

// Validation error codes
export enum VideoValidationError {
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  FILE_TOO_SMALL = "FILE_TOO_SMALL",
  VIDEO_TOO_LONG = "VIDEO_TOO_LONG",
  VIDEO_TOO_SHORT = "VIDEO_TOO_SHORT",
  NO_AUDIO_TRACK = "NO_AUDIO_TRACK",
  INVALID_AUDIO_FORMAT = "INVALID_AUDIO_FORMAT",
  LANGUAGE_NOT_SUPPORTED = "LANGUAGE_NOT_SUPPORTED",
  LANGUAGE_DETECTION_FAILED = "LANGUAGE_DETECTION_FAILED",
  PROCESSING_ERROR = "PROCESSING_ERROR",
  CORRUPTED_FILE = "CORRUPTED_FILE",
  INVALID_FORMAT = "INVALID_FORMAT"
}

// Validation error messages
export const VALIDATION_ERROR_MESSAGES: Record<VideoValidationError, string> = {
  [VideoValidationError.INVALID_FILE_TYPE]: "Invalid file type. Please upload a video file (MP4, MOV, AVI, MKV, WEBM).",
  [VideoValidationError.FILE_TOO_LARGE]: "File size exceeds 50MB limit. Please compress your video or choose a shorter clip.",
  [VideoValidationError.FILE_TOO_SMALL]: "File is too small. Please upload a valid video file.",
  [VideoValidationError.VIDEO_TOO_LONG]: "Video duration exceeds 10.2 seconds limit. Please trim your video.",
  [VideoValidationError.VIDEO_TOO_SHORT]: "Video is too short. Please upload a video with at least 1 second duration.",
  [VideoValidationError.NO_AUDIO_TRACK]: "No audio track detected. Please upload a video with audio.",
  [VideoValidationError.INVALID_AUDIO_FORMAT]: "Invalid audio format detected. Please use a standard audio codec.",
  [VideoValidationError.LANGUAGE_NOT_SUPPORTED]: "Language not supported. Please use English, Vietnamese, Hindi, French, or Spanish.",
  [VideoValidationError.LANGUAGE_DETECTION_FAILED]: "Failed to detect video language. Please ensure clear audio is present.",
  [VideoValidationError.PROCESSING_ERROR]: "Error processing video. Please try again or use a different file.",
  [VideoValidationError.CORRUPTED_FILE]: "Video file appears to be corrupted. Please upload a valid video file.",
  [VideoValidationError.INVALID_FORMAT]: "Invalid video format. Please use a standard video format."
};

// Language-specific validation rules
export const LANGUAGE_VALIDATION_RULES = {
  en: {
    minDuration: 1,
    maxDuration: 10.2,
    maxSize: 50 * 1024 * 1024, // 50MB
    minConfidence: 0.7,
    supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  },
  vi: {
    minDuration: 1,
    maxDuration: 10.2,
    maxSize: 50 * 1024 * 1024, // 50MB
    minConfidence: 0.6,
    supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  },
  hi: {
    minDuration: 1,
    maxDuration: 10.2,
    maxSize: 50 * 1024 * 1024, // 50MB
    minConfidence: 0.6,
    supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  },
  fr: {
    minDuration: 1,
    maxDuration: 10.2,
    maxSize: 50 * 1024 * 1024, // 50MB
    minConfidence: 0.7,
    supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  },
  es: {
    minDuration: 1,
    maxDuration: 10.2,
    maxSize: 50 * 1024 * 1024, // 50MB
    minConfidence: 0.7,
    supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  }
};

// Video metadata schema
export const VideoMetadataSchema = z.object({
  duration: z.number().positive(),
  hasVideo: z.boolean(),
  hasAudio: z.boolean(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  format: z.string(),
  size: z.number().positive(),
  audioCodec: z.string().optional(),
  videoCodec: z.string().optional(),
  frameRate: z.number().positive().optional(),
  bitRate: z.number().positive().optional()
});

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

// Language detection result schema
export const LanguageDetectionResultSchema = z.object({
  language: z.string(),
  confidence: z.number().min(0).max(1),
  detectedText: z.string().optional(),
  alternatives: z.array(z.object({
    language: z.string(),
    confidence: z.number().min(0).max(1)
  })).optional()
});

export type LanguageDetectionResult = z.infer<typeof LanguageDetectionResultSchema>;

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    code: z.nativeEnum(VideoValidationError),
    message: z.string(),
    details: z.any().optional()
  })),
  metadata: VideoMetadataSchema.optional(),
  languageDetection: LanguageDetectionResultSchema.optional(),
  processingTime: z.number(),
  warnings: z.array(z.string()).optional()
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Supported video formats
const SUPPORTED_FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DURATION = 10.2; // seconds
const MIN_DURATION = 1; // second

export class VideoValidator {
  private openai: OpenAI;
  private logger: (message: string, data?: any) => void;

  constructor(apiKey?: string, logger?: (message: string, data?: any) => void) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.logger = logger || console.log;
  }

  /**
   * Main validation method - validates video file against all criteria
   */
  async validateVideo(
    file: File,
    options: {
      targetLanguage?: string;
      enableLanguageDetection?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: Array<{
      code: VideoValidationError;
      message: string;
      details?: any;
    }> = [];
    const warnings: string[] = [];

    try {
      this.logger('Starting video validation', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        options
      });

      // Step 1: Basic file validation
      const fileValidation = this.validateFileBasics(file);
      if (!fileValidation.isValid) {
        errors.push(...fileValidation.errors);
      }

      // Step 2: Extract video metadata
      let metadata: VideoMetadata | undefined;
      try {
        metadata = await this.extractVideoMetadata(file);
        this.logger('Video metadata extracted', { metadata });
      } catch (error) {
        errors.push({
          code: VideoValidationError.PROCESSING_ERROR,
          message: 'Failed to extract video metadata',
          details: error instanceof Error ? error.message : error
        });
      }

      // Step 3: Validate video content
      if (metadata) {
        const contentValidation = this.validateVideoContent(metadata);
        if (!contentValidation.isValid) {
          errors.push(...contentValidation.errors);
        }
        warnings.push(...(contentValidation.warnings || []));
      }

      // Step 4: Language detection (if enabled)
      let languageDetection: LanguageDetectionResult | undefined;
      if (options.enableLanguageDetection && metadata && errors.length === 0) {
        try {
          languageDetection = await this.detectVideoLanguage(file, metadata);
          this.logger('Language detection completed', { languageDetection });

          if (options.targetLanguage && languageDetection.language !== options.targetLanguage) {
            errors.push({
              code: VideoValidationError.LANGUAGE_NOT_SUPPORTED,
              message: `Detected language (${languageDetection.language}) does not match target language (${options.targetLanguage})`,
              details: {
                detected: languageDetection.language,
                expected: options.targetLanguage,
                confidence: languageDetection.confidence
              }
            });
          }
        } catch (error) {
          if (options.strictMode) {
            errors.push({
              code: VideoValidationError.LANGUAGE_DETECTION_FAILED,
              message: 'Language detection failed',
              details: error instanceof Error ? error.message : error
            });
          } else {
            warnings.push('Language detection failed, proceeding with validation');
          }
        }
      }

      // Step 5: Apply language-specific rules
      if (options.targetLanguage && metadata) {
        const languageValidation = this.validateLanguageSpecificRules(
          metadata,
          options.targetLanguage,
          languageDetection
        );
        if (!languageValidation.isValid) {
          errors.push(...languageValidation.errors);
        }
        warnings.push(...(languageValidation.warnings || []));
      }

      const processingTime = Date.now() - startTime;
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        metadata,
        languageDetection,
        processingTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

      this.logger('Video validation completed', {
        isValid: result.isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        processingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger('Video validation failed with error', {
        error: error instanceof Error ? error.message : error,
        processingTime
      });

      return {
        isValid: false,
        errors: [{
          code: VideoValidationError.PROCESSING_ERROR,
          message: 'Validation process failed',
          details: error instanceof Error ? error.message : error
        }],
        processingTime
      };
    }
  }

  /**
   * Basic file validation - size, type, format
   */
  private validateFileBasics(file: File): { isValid: boolean; errors: Array<{ code: VideoValidationError; message: string; details?: any }> } {
    const errors: Array<{ code: VideoValidationError; message: string; details?: any }> = [];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        code: VideoValidationError.FILE_TOO_LARGE,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.FILE_TOO_LARGE],
        details: {
          size: file.size,
          maxSize: MAX_FILE_SIZE,
          maxSizeMB: MAX_FILE_SIZE / (1024 * 1024)
        }
      });
    }

    if (file.size < 1024) { // Less than 1KB
      errors.push({
        code: VideoValidationError.FILE_TOO_SMALL,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.FILE_TOO_SMALL],
        details: {
          size: file.size
        }
      });
    }

    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      errors.push({
        code: VideoValidationError.INVALID_FILE_TYPE,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.INVALID_FILE_TYPE],
        details: {
          fileName: file.name,
          extension: fileExtension,
          supportedFormats: SUPPORTED_FORMATS
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract video metadata using FFprobe
   */
  private async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video metadata extraction timed out'));
      }, 30000);

      // Convert File to buffer for FFprobe
      const arrayBuffer = file.arrayBuffer();
      arrayBuffer.then(buffer => {
        // Create a temporary file path for FFprobe
        const tempFilePath = `temp_${Date.now()}.${file.name.split('.').pop()}`;

        // For now, we'll simulate metadata extraction
        // In a real implementation, you'd need to save the buffer to a temp file
        clearTimeout(timeout);

        // Mock metadata for demonstration
        resolve({
          duration: 8.5, // Mock duration
          hasVideo: true,
          hasAudio: true,
          resolution: { width: 1920, height: 1080 },
          format: file.type || 'mp4',
          size: file.size,
          audioCodec: 'aac',
          videoCodec: 'h264',
          frameRate: 30,
          bitRate: 5000000
        });
      }).catch(reject);
    });
  }

  /**
   * Validate video content based on metadata
   */
  private validateVideoContent(metadata: VideoMetadata): {
    isValid: boolean;
    errors: Array<{ code: VideoValidationError; message: string; details?: any }>;
    warnings?: string[];
  } {
    const errors: Array<{ code: VideoValidationError; message: string; details?: any }> = [];
    const warnings: string[] = [];

    // Check duration
    if (metadata.duration > MAX_DURATION) {
      errors.push({
        code: VideoValidationError.VIDEO_TOO_LONG,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.VIDEO_TOO_LONG],
        details: {
          duration: metadata.duration,
          maxDuration: MAX_DURATION
        }
      });
    }

    if (metadata.duration < MIN_DURATION) {
      errors.push({
        code: VideoValidationError.VIDEO_TOO_SHORT,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.VIDEO_TOO_SHORT],
        details: {
          duration: metadata.duration,
          minDuration: MIN_DURATION
        }
      });
    }

    // Check audio track
    if (!metadata.hasAudio) {
      errors.push({
        code: VideoValidationError.NO_AUDIO_TRACK,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.NO_AUDIO_TRACK],
        details: {
          hasVideo: metadata.hasVideo,
          format: metadata.format
        }
      });
    }

    // Check for potential issues (warnings)
    if (metadata.resolution.width < 640 || metadata.resolution.height < 480) {
      warnings.push('Low resolution detected. Consider using higher quality video for better results.');
    }

    if (metadata.duration < 3) {
      warnings.push('Short video duration detected. Language detection may be less accurate.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Detect video language using Whisper API
   */
  private async detectVideoLanguage(file: File, metadata: VideoMetadata): Promise<LanguageDetectionResult> {
    try {
      this.logger('Starting language detection', {
        fileName: file.name,
        duration: metadata.duration
      });

      // Extract audio from video and send to Whisper
      // For this demo, we'll simulate the API call
      // In production, you'd need to extract audio and send to Whisper

      // Mock response for demonstration
      const mockResponse: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.85,
        detectedText: 'This is a sample video for testing purposes.',
        alternatives: [
          { language: 'en', confidence: 0.85 },
          { language: 'es', confidence: 0.10 },
          { language: 'fr', confidence: 0.05 }
        ]
      };

      return mockResponse;

      // Actual implementation would look something like:
      /*
      // Extract audio from video
      const audioBuffer = await this.extractAudioFromVideo(file);

      // Send to Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' }),
        model: 'whisper-1',
        response_format: 'verbose_json',
        language: 'en' // Optional: hint the language
      });

      // Parse response and extract language information
      return {
        language: response.language || 'en',
        confidence: 0.8, // Whisper doesn't provide confidence scores directly
        detectedText: response.text,
        alternatives: [] // You could implement alternative language detection
      };
      */

    } catch (error) {
      this.logger('Language detection failed', { error });
      throw new Error(`Language detection failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Validate language-specific rules
   */
  private validateLanguageSpecificRules(
    metadata: VideoMetadata,
    targetLanguage: string,
    languageDetection?: LanguageDetectionResult
  ): {
    isValid: boolean;
    errors: Array<{ code: VideoValidationError; message: string; details?: any }>;
    warnings?: string[];
  } {
    const errors: Array<{ code: VideoValidationError; message: string; details?: any }> = [];
    const warnings: string[] = [];

    const rules = LANGUAGE_VALIDATION_RULES[targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES];

    if (!rules) {
      errors.push({
        code: VideoValidationError.LANGUAGE_NOT_SUPPORTED,
        message: VALIDATION_ERROR_MESSAGES[VideoValidationError.LANGUAGE_NOT_SUPPORTED],
        details: {
          targetLanguage,
          supportedLanguages: Object.keys(LANGUAGE_VALIDATION_RULES)
        }
      });
      return { isValid: false, errors };
    }

    // Check language-specific duration limits
    if (metadata.duration > rules.maxDuration) {
      errors.push({
        code: VideoValidationError.VIDEO_TOO_LONG,
        message: `Video duration exceeds ${rules.maxDuration}s limit for ${targetLanguage}`,
        details: {
          duration: metadata.duration,
          maxDuration: rules.maxDuration,
          language: targetLanguage
        }
      });
    }

    if (metadata.duration < rules.minDuration) {
      errors.push({
        code: VideoValidationError.VIDEO_TOO_SHORT,
        message: `Video duration is below ${rules.minDuration}s minimum for ${targetLanguage}`,
        details: {
          duration: metadata.duration,
          minDuration: rules.minDuration,
          language: targetLanguage
        }
      });
    }

    // Check language-specific size limits
    if (metadata.size > rules.maxSize) {
      errors.push({
        code: VideoValidationError.FILE_TOO_LARGE,
        message: `File size exceeds limit for ${targetLanguage}`,
        details: {
          size: metadata.size,
          maxSize: rules.maxSize,
          maxSizeMB: rules.maxSize / (1024 * 1024),
          language: targetLanguage
        }
      });
    }

    // Check language detection confidence
    if (languageDetection && languageDetection.confidence < rules.minConfidence) {
      warnings.push(
        `Low language detection confidence (${(languageDetection.confidence * 100).toFixed(1)}%) for ${targetLanguage}. ` +
        'Results may be less accurate.'
      );
    }

    // Perform language-specific validation
    if (languageDetection?.detectedText) {
      const languageValidation = LanguageSpecificValidators.validateLanguage(
        languageDetection.detectedText,
        targetLanguage
      );

      if (!languageValidation.isValid) {
        errors.push({
          code: VideoValidationError.LANGUAGE_NOT_SUPPORTED,
          message: `Language-specific validation failed for ${targetLanguage}`,
          details: {
            language: targetLanguage,
            validationErrors: languageValidation.errors,
            validationDetails: languageValidation.details
          }
        });
      }

      // Add language-specific warnings
      if (targetLanguage === 'vi' && !languageValidation.details.hasDiacritics) {
        warnings.push('Vietnamese text lacks proper diacritic marks. Transcription accuracy may be reduced.');
      }

      if (targetLanguage === 'hi' && !languageValidation.details.hasDevanagari) {
        warnings.push('Hindi text should use Devanagari script for best results.');
      }

      if (targetLanguage === 'fr' && !languageValidation.details.hasAccents) {
        warnings.push('French text lacks accent marks. Natural language processing may be affected.');
      }

      if (targetLanguage === 'es' && !languageValidation.details.hasAccents) {
        warnings.push('Spanish text lacks accent marks. Pronunciation and meaning may be ambiguous.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Extract audio from video file (helper method)
   */
  private async extractAudioFromVideo(file: File): Promise<Buffer> {
    // This would use FFmpeg to extract audio from video
    // For now, return empty buffer
    return Buffer.alloc(0);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_VALIDATION_RULES);
  }

  /**
   * Get validation rules for a specific language
   */
  getLanguageRules(language: string) {
    return LANGUAGE_VALIDATION_RULES[language as keyof typeof LANGUAGE_VALIDATION_RULES];
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}