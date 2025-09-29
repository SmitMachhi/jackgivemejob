import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import {
  renderService,
  RenderInput,
  JobEvent,
} from "@/lib/services/render-service";
import { languageOptions } from "@/app/components/LanguageSelector";
import {
  transcribeEnTask,
  type TranscribeEnInput,
  type TranscriptionResult,
} from "./transcribeEn";
import {
  generateMultiLanguageCaptions,
  type CaptionAgentInput,
  type CaptionResult,
} from "./captionAgent";
import {
  videoProcessingTask,
  type VideoProcessingInput,
  type VideoProcessingOutput,
} from "./videoProcessing";
import {
  downloadTask,
  type DownloadTaskInput,
  type DownloadTaskOutput,
} from "./downloadTask";

// Language-specific configuration
const LANGUAGE_CONFIG = {
  vi: {
    retry: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
    timeout: 300,
    validationRules: {
      maxDuration: 10,
      maxFileSize: 50 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov", "avi"],
    },
  },
  hi: {
    retry: {
      maxAttempts: 4,
      minTimeoutInMs: 3000,
      maxTimeoutInMs: 40000,
      factor: 2,
      randomize: true,
    },
    timeout: 420,
    validationRules: {
      maxDuration: 12,
      maxFileSize: 55 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov", "avi"],
    },
  },
  fr: {
    retry: {
      maxAttempts: 3,
      minTimeoutInMs: 2200,
      maxTimeoutInMs: 32000,
      factor: 2,
      randomize: true,
    },
    timeout: 330,
    validationRules: {
      maxDuration: 12,
      maxFileSize: 55 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov", "avi"],
    },
  },
  es: {
    retry: {
      maxAttempts: 3,
      minTimeoutInMs: 2500,
      maxTimeoutInMs: 35000,
      factor: 2,
      randomize: true,
    },
    timeout: 360,
    validationRules: {
      maxDuration: 15,
      maxFileSize: 60 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov"],
    },
  },
};

// Input validation schema for the render workflow
export const RenderWorkflowSchema = z.object({
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),
  templateId: z.string().optional(),
  data: z.record(z.any()).default({}),
  format: z.enum(["pdf", "html", "image", "video"]).default("pdf"),
  options: z.record(z.any()).optional().default({}),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  webhookUrl: z.string().url("Webhook URL must be valid").optional(),
  timeout: z.number().positive().min(30).max(3600).default(300), // 5 minutes default
  retryAttempts: z.number().min(0).max(5).default(2),
  // Language support
  targetLanguage: z.enum(["vi", "hi", "fr", "es"]).default("vi"),
  // Download configuration
  downloadConfig: z
    .object({
      enabled: z.boolean().default(false),
      url: z.string().url().optional(),
      filename: z.string().optional(),
      maxRetries: z.number().min(0).max(10).default(3),
      timeout: z.number().positive().min(5).max(300).default(60),
      validateContentType: z.boolean().default(true),
    })
    .optional()
    .default({ enabled: false }),
});

export type RenderWorkflowInput = z.infer<typeof RenderWorkflowSchema>;

// Output schema for workflow results
export const RenderWorkflowOutputSchema = z.object({
  jobId: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  input: z.any(),
  output: z.any().optional(),
  error: z.string().optional(),
  duration: z.number(),
  events: z.array(z.any()),
  webhookDelivered: z.boolean().optional(),
  webhookResponse: z.any().optional(),
});

export type RenderWorkflowOutput = z.infer<typeof RenderWorkflowOutputSchema>;

// Helper function to validate language-specific constraints
function validateLanguageConstraints(input: RenderWorkflowInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const supportedLanguages = languageOptions.map((lang) => lang.code);

  // Check if language is supported
  if (!supportedLanguages.includes(input.targetLanguage)) {
    errors.push(
      `Unsupported language: ${
        input.targetLanguage
      }. Supported: ${supportedLanguages.join(", ")}`
    );
  }

  // Check if timeout is within reasonable limits for the language
  const langConfig = LANGUAGE_CONFIG[input.targetLanguage];
  if (input.timeout > langConfig.timeout * 2) {
    errors.push(
      `Timeout too long for ${input.targetLanguage}: ${input.timeout}s > ${
        langConfig.timeout * 2
      }s`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper function to get language-specific error message
function getLanguageErrorMessage(language: string, errorType: string): string {
  const messages = {
    vi: {
      timeout: "Xử lý tiếng Việt đang mất nhiều thời gian hơn dự kiến",
      validation: "Xác thực video tiếng Việt thất bại",
      processing: "Lỗi xử lý tiếng Việt",
      transcription: "Lỗi chuyển giọng nói tiếng Việt thành văn bản",
      caption: "Lỗi tạo phụ đề tiếng Việt",
      video: "Lỗi xử lý video tiếng Việt",
      network: "Lỗi kết nối mạng khi xử lý tiếng Việt",
      file: "Lỗi tệp tin tiếng Việt không hợp lệ",
      format: "Lỗi định dạng video tiếng Việt không được hỗ trợ",
      audio: "Lỗi âm thanh tiếng Việt không rõ",
      language: "Lỗi nhận dạng ngôn ngữ tiếng Việt",
    },
    hi: {
      timeout: "हिंदी प्रसंस्करण अपेक्षा से अधिक समय ले रहा है",
      validation: "हिंदी वीडियो सत्यापन विफल",
      processing: "हिंदी प्रसंस्करण त्रुटि",
      transcription: "हिंदी भाषण-से-पाठ परिवर्तन त्रुटि",
      caption: "हिंदी कैप्शन निर्माण त्रुटि",
      video: "हिंदी वीडियो प्रसंस्करण त्रुटि",
      network: "हिंदी प्रसंस्करण में नेटवर्क त्रुटि",
      file: "अमान्य हिंदी फाइल त्रुटि",
      format: "असमर्थित हिंदी वीडियो प्रारूप",
      audio: "हिंदी ऑडियो गुणवत्ता त्रुटि",
      language: "हिंदी भाषा पहचान त्रुटि",
    },
    es: {
      timeout: "El procesamiento en español está tardando más de lo esperado",
      validation: "La validación del video en español falló",
      processing: "Error de procesamiento en español",
      transcription: "Error en la transcripción del español",
      caption: "Error en la generación de subtítulos en español",
      video: "Error en el procesamiento de video en español",
      network: "Error de red durante el procesamiento en español",
      file: "Error de archivo español inválido",
      format: "Formato de video español no compatible",
      audio: "Error de audio español poco claro",
      language: "Error de reconocimiento de idioma español",
    },
    fr: {
      timeout: "Le traitement en français prend plus de temps que prévu",
      validation: "La validation vidéo en français a échoué",
      processing: "Erreur de traitement en français",
      transcription: "Erreur de transcription française",
      caption: "Erreur de génération de sous-titres français",
      video: "Erreur de traitement vidéo français",
      network: "Erreur réseau lors du traitement en français",
      file: "Erreur de fichier français invalide",
      format: "Format vidéo français non pris en charge",
      audio: "Erreur audio français peu clair",
      language: "Erreur de reconnaissance de langue française",
    },
  };

  return (
    messages[language as keyof typeof messages]?.[
      errorType as keyof typeof messages.vi
    ] || `${errorType} error for ${language}`
  );
}

// Enhanced language-specific error handler with detailed context
function handleLanguageSpecificError(
  language: string,
  errorType: string,
  error: Error | unknown,
  context?: {
    jobId?: string;
    phase?: string;
    retryCount?: number;
    additionalInfo?: Record<string, any>;
  }
): {
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  shouldRetry: boolean;
} {
  const baseMessage = getLanguageErrorMessage(language, errorType);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Determine severity based on error type and context
  let severity: "low" | "medium" | "high" | "critical" = "medium";
  let shouldRetry = true;

  switch (errorType) {
    case "timeout":
      severity =
        context?.retryCount && context.retryCount > 2 ? "high" : "medium";
      shouldRetry = context?.retryCount ? context.retryCount < 3 : true;
      break;

    case "validation":
      severity = "high";
      shouldRetry = false; // Validation errors usually require user input
      break;

    case "format":
    case "file":
      severity = "high";
      shouldRetry = false; // File/format errors need user intervention
      break;

    case "network":
      severity =
        context?.retryCount && context.retryCount > 3 ? "high" : "medium";
      shouldRetry = context?.retryCount ? context.retryCount < 5 : true;
      break;

    case "language":
      severity = "critical";
      shouldRetry = false; // Language detection failures are critical
      break;

    default:
      severity = "medium";
      shouldRetry = true;
  }

  // Create detailed error message
  const detailedMessage = `${baseMessage}: ${errorMessage}${
    context?.phase ? ` (fase: ${context.phase})` : ""
  }${context?.jobId ? ` (ID: ${context.jobId})` : ""}`;

  return {
    message: detailedMessage,
    severity,
    shouldRetry,
  };
}

// Language-specific validation functions
function validateLanguageSpecificInput(
  language: string,
  input: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (language) {
    case "vi":
      // Vietnamese validation
      if (input.fileName && !/^[\p{L}\p{N}\s\-\._]+$/u.test(input.fileName)) {
        errors.push("Tên file tiếng Việt chứa ký tự không hợp lệ");
      }
      if (input.duration && input.duration > 600) {
        errors.push("Thời lượng video tiếng Việt quá dài (tối đa 10 phút)");
      }
      break;

    case "hi":
      // Hindi validation
      if (
        input.fileName &&
        !/^[\u0900-\u097F\p{L}\p{N}\s\-\._]+$/u.test(input.fileName)
      ) {
        errors.push("हिंदी फाइल नाम में अमान्य वर्ण हैं");
      }
      if (input.duration && input.duration > 480) {
        errors.push("हिंदी वीडियो की अवधि बहुत लंबी है (अधिकतम 8 मिनट)");
      }
      break;

    case "fr":
      // French validation
      if (
        input.fileName &&
        !/^[a-zA-Z0-9\s\-\._àâäçéèêëïîôùûüÿñæœÀÂÄÇÉÈÊËÏÎÔÙÛÜŸÑÆŒ]+$/.test(
          input.fileName
        )
      ) {
        errors.push(
          "Le nom de fichier français contient des caractères invalides"
        );
      }
      if (input.duration && input.duration > 900) {
        errors.push("La vidéo française est trop longue (maximum 15 minutes)");
      }
      break;

    case "es":
      // Spanish validation
      if (
        input.fileName &&
        !/^[a-zA-Z0-9\s\-\._áéíóúüñÁÉÍÓÚÜÑ¿¡]+$/.test(input.fileName)
      ) {
        errors.push(
          "El nombre de archivo español contiene caracteres inválidos"
        );
      }
      if (input.duration && input.duration > 900) {
        errors.push("El video español es demasiado largo (máximo 15 minutos)");
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Render Workflow - A comprehensive workflow for handling render jobs
 *
 * This workflow handles the complete lifecycle of render jobs including:
 * - Job creation and validation
 * - Render processing with progress tracking
 * - Error handling and retries
 * - Webhook notifications
 * - Event logging and monitoring
 */
export const renderWorkflow = task({
  id: "render-workflow",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: RenderWorkflowInput, { ctx }) => {
    const startTime = Date.now();
    let validatedInput: RenderWorkflowInput | undefined;
    console.log("Starting render workflow", { payload });

    try {
      // Validate input using Zod schema
      validatedInput = RenderWorkflowSchema.parse(payload);
      console.log("Input validated", { validatedInput });

      // Get language-specific configuration
      const workflowLangConfig = LANGUAGE_CONFIG[validatedInput.targetLanguage];
      console.log("Language configuration loaded", {
        targetLanguage: validatedInput.targetLanguage,
        config: workflowLangConfig,
      });

      // Step 1: Create or retrieve job with language support
      let job;
      if (validatedInput.jobId) {
        job = await renderService.getJob(validatedInput.jobId);
        if (!job) {
          console.log(
            `Job with ID ${validatedInput.jobId} not found, creating new job instead`
          );
          // Create a new job with the provided data if the job doesn't exist
          const renderInput: RenderInput = {
            templateId: validatedInput.templateId || "video-render",
            data: {
              ...validatedInput.data,
              targetLanguage: validatedInput.targetLanguage,
              languageConfig: workflowLangConfig,
            },
            format: validatedInput.format,
            options: {
              ...validatedInput.options,
              targetLanguage: validatedInput.targetLanguage,
              languageRules: workflowLangConfig.validationRules,
            },
            targetLanguage: validatedInput.targetLanguage,
          };
          job = await renderService.createJob(renderInput);
          console.log("Created new job (replacing missing job)", {
            jobId: job.id,
            targetLanguage: validatedInput.targetLanguage,
          });
        } else {
          console.log("Retrieved existing job", {
            jobId: job.id,
            status: job.status,
          });
        }
      } else {
        const renderInput: RenderInput = {
          templateId: validatedInput.templateId,
          data: {
            ...validatedInput.data,
            targetLanguage: validatedInput.targetLanguage,
            languageConfig: workflowLangConfig,
          },
          format: validatedInput.format,
          options: {
            ...validatedInput.options,
            targetLanguage: validatedInput.targetLanguage,
            languageRules: workflowLangConfig.validationRules,
          },
          targetLanguage: validatedInput.targetLanguage,
        };
        job = await renderService.createJob(renderInput);
        console.log("Created new job", {
          jobId: job.id,
          targetLanguage: validatedInput.targetLanguage,
        });
      }

      // Validate language-specific constraints after job is created
      const languageValidation = validateLanguageConstraints(validatedInput);
      if (!languageValidation.isValid) {
        const errorHandling = handleLanguageSpecificError(
          validatedInput.targetLanguage,
          "validation",
          new Error(languageValidation.errors.join(", ")),
          {
            jobId: job.id,
            phase: "initial_validation",
            additionalInfo: { errors: languageValidation.errors },
          }
        );
        throw new Error(errorHandling.message);
      }

      // Step 2: Download file from Blob storage if needed
      let localFilePath =
        job.input.validation?.filePath ||
        job.input.data?.filePath ||
        job.input.data?.localFilePath;

      console.log("Initial file path check", {
        jobId: job.id,
        validationPath: job.input.validation?.filePath,
        dataPath: job.input.data?.filePath,
        dataLocalPath: job.input.data?.localFilePath,
        initialLocalFilePath: localFilePath,
        downloadEnabled: job.input.downloadConfig?.enabled,
        downloadUrl: job.input.downloadConfig?.url,
      });

      if (job.input.downloadConfig?.enabled && job.input.downloadConfig?.url && !localFilePath) {
        console.log("Starting download task", {
          jobId: job.id,
          downloadUrl: job.input.downloadConfig.url,
          filename: job.input.downloadConfig.filename,
        });

        try {
          const downloadPayload: DownloadTaskInput = {
            blobUrl: job.input.downloadConfig.url,
            jobId: job.id,
            filename: job.input.downloadConfig.filename || "downloaded_file",
            timeout: job.input.downloadConfig.timeout || 60,
            maxRetries: job.input.downloadConfig.maxRetries || 3,
          };

          const downloadResponse = await downloadTask.triggerAndWait(
            downloadPayload
          );

          if (!downloadResponse.ok) {
            throw new Error(
              `Download failed: ${downloadResponse.error || "Unknown error"}`
            );
          }

          localFilePath = downloadResponse.output.filePath;
          console.log("File downloaded successfully", {
            jobId: job.id,
            localFilePath,
            fileSize: downloadResponse.output.fileSize,
            filename: downloadResponse.output.filename,
            downloadTime: downloadResponse.output.downloadTime,
          });
        } catch (error) {
          const errorHandling = handleLanguageSpecificError(
            validatedInput.targetLanguage,
            "download",
            error,
            {
              jobId: job.id,
              phase: "file_download",
              additionalInfo: {
                downloadUrl: job.input.downloadConfig?.url,
                error: error instanceof Error ? error.message : String(error),
              },
            }
          );
          throw new Error(errorHandling.message);
        }
      }

      // Step 3: Execute transcription task with language support
      console.log("Starting transcription task", {
        jobId: job.id,
        targetLanguage: validatedInput.targetLanguage,
        inputFile: localFilePath,
      });

      // Validate that we have a valid file path before proceeding
      if (!localFilePath || localFilePath.trim() === "") {
        const errorHandling = handleLanguageSpecificError(
          validatedInput.targetLanguage,
          "file",
          new Error("No valid file path available for transcription"),
          {
            jobId: job.id,
            phase: "transcription_validation",
            additionalInfo: {
              localFilePath,
              jobData: job.input.data,
              jobValidation: job.input.validation,
            },
          }
        );
        throw new Error(errorHandling.message);
      }

      let transcriptionResult: TranscriptionResult;
      try {
        const transcriptionResponse = await transcribeEnTask.triggerAndWait({
          filePath: localFilePath,
          fileName:
            job.input.validation?.fileName ||
            job.input.data?.fileName ||
            "video.mp4",
          mimeType:
            job.input.validation?.mimeType ||
            job.input.data?.mimeType ||
            "video/mp4",
          jobId: job.id,
          language: "en", // Force English for transcription
          maxRetries: workflowLangConfig.retry.maxAttempts,
          timeout: Math.min(workflowLangConfig.timeout, 300), // Ensure timeout doesn't exceed 300 seconds
          temperature: 0.0,
          responseFormat: "verbose_json",
          timestampGranularities: ["word", "segment"],
          enableCache: true,
          cacheTtl: 3600,
          enableVad: true,
          minWordCount: 5,
          minConfidenceScore: 0.7,
          enableCostTracking: true,
          maxCostLimit: 1.0,
          languageConfidenceThreshold: 0.8,
          enableRealtimeEvents: true,
          retryBackoffFactor: 2,
          retryBaseDelay: 2000,
          enableVerboseLogging: false,
        });

        if (!transcriptionResponse.ok) {
          throw new Error(
            `Transcription failed: ${
              transcriptionResponse.error || "Unknown error"
            }`
          );
        }

        transcriptionResult = transcriptionResponse.output;

        console.log("Transcription completed successfully", {
          jobId: job.id,
          wordCount: transcriptionResult.wordCount,
          language: transcriptionResult.language,
          processingTime: transcriptionResult.processingTime,
        });
      } catch (error) {
        const errorHandling = handleLanguageSpecificError(
          validatedInput.targetLanguage,
          "transcription",
          error,
          {
            jobId: job.id,
            phase: "transcription",
            retryCount: 0,
            additionalInfo: {
              filePath: localFilePath,
              language: validatedInput.targetLanguage,
            },
          }
        );
        throw new Error(errorHandling.message);
      }

      // Step 4: Execute caption agent task with language support
      console.log("Starting caption generation", {
        jobId: job.id,
        targetLanguage: validatedInput.targetLanguage,
        transcriptionWordCount: transcriptionResult.wordCount,
      });

      let captionResult: any;
      try {
        const captionPayload = {
          filePath: localFilePath || "",
          fileName:
            job.input.validation?.fileName ||
            job.input.data?.fileName ||
            "video.mp4",
          targetLanguage: validatedInput.targetLanguage as
            | "vi"
            | "hi"
            | "fr"
            | "es",
          sourceLanguage: "en",
          jobId: job.id,
          style: "neutral" as const,
          context: "video_processing",
          maxCaptionLength: 80,
          enableValidation: true,
        };

        const captionResponse =
          await generateMultiLanguageCaptions.triggerAndWait(captionPayload);

        if (!captionResponse.ok) {
          throw new Error(
            `Caption generation failed: ${
              captionResponse.error || "Unknown error"
            }`
          );
        }

        captionResult = captionResponse.output;

        console.log("Caption generation completed successfully", {
          jobId: job.id,
          captionCount: captionResult.captions?.length || 0,
          language:
            captionResult.metadata?.language || validatedInput.targetLanguage,
        });
      } catch (error) {
        const errorHandling = handleLanguageSpecificError(
          validatedInput.targetLanguage,
          "caption",
          error,
          {
            jobId: job.id,
            phase: "caption_generation",
            retryCount: 0,
            additionalInfo: {
              language: validatedInput.targetLanguage,
              transcriptionWordCount: transcriptionResult.wordCount,
            },
          }
        );
        throw new Error(errorHandling.message);
      }

      // Step 5: Execute video processing task with language support
      console.log("Starting video processing", {
        jobId: job.id,
        targetLanguage: validatedInput.targetLanguage,
        captionCount: captionResult.captions.length,
      });

      let videoProcessingResult: any;
      try {
        const videoPayload = {
          inputVideoPath: localFilePath || "",
          outputVideoPath: `/tmp/output_${job.id}.mp4`,
          captions: captionResult.captions || [],
          targetLanguage: validatedInput.targetLanguage,
          jobId: job.id,
          timeout: Math.min(workflowLangConfig.timeout, 300),
          maxRetries: workflowLangConfig.retry.maxAttempts,
          quality: "high" as "high",
          preserveAudio: true,
          addWatermark: false,
          fontConfig: {
            fontFamily:
              validatedInput.targetLanguage === "hi"
                ? "NotoSansDevanagari-Regular"
                : validatedInput.targetLanguage === "vi"
                ? "NotoSans-Regular"
                : validatedInput.targetLanguage === "fr"
                ? "NotoSans-Regular"
                : validatedInput.targetLanguage === "es"
                ? "NotoSans-Regular"
                : "NotoSans-Regular",
            fontSize: 24,
            fontColor: "white",
            backgroundColor: "black@0.7",
            outlineColor: "black@0.8",
            shadowColor: "black@0.5",
            position: { x: "(w-tw)/2", y: "h-th-20" },
          },
        };

        const videoResponse = await videoProcessingTask.triggerAndWait(
          videoPayload
        );

        if (!videoResponse.ok) {
          throw new Error(
            `Video processing failed: ${videoResponse.error || "Unknown error"}`
          );
        }

        videoProcessingResult = videoResponse.output;

        console.log("Video processing completed successfully", {
          jobId: job.id,
          outputPath: videoProcessingResult.outputPath,
          processingTime: videoProcessingResult.processingTime,
        });
      } catch (error) {
        const errorHandling = handleLanguageSpecificError(
          validatedInput.targetLanguage,
          "video",
          error,
          {
            jobId: job.id,
            phase: "video_processing",
            retryCount: 0,
            additionalInfo: {
              language: validatedInput.targetLanguage,
              captionCount: captionResult.captions?.length || 0,
              customFont:
                validatedInput.targetLanguage === "hi"
                  ? "NotoSansDevanagari-Regular"
                  : "NotoSans-Regular",
            },
          }
        );
        throw new Error(errorHandling.message);
      }

      // Step 6: Update job with final results
      const duration = Date.now() - startTime;
      const finalOutput = {
        transcription: transcriptionResult,
        captions: captionResult,
        videoProcessing: videoProcessingResult,
        language: validatedInput.targetLanguage,
        url: videoProcessingResult.outputPath,
        downloadUrl: videoProcessingResult.outputPath,
        previewUrl: videoProcessingResult.thumbnailPath || null,
        metadata: {
          processedAt: new Date(),
          duration: videoProcessingResult.duration,
          size: videoProcessingResult.fileSize.toString(),
          format: "mp4",
          resolution: videoProcessingResult.resolution,
          quality: videoProcessingResult.quality,
          languages: [validatedInput.targetLanguage],
          processingStats: {
            totalSegments: captionResult.captions?.length || 0,
            successfulSegments: captionResult.captions?.length || 0,
            failedSegments: 0,
            averageConfidence: transcriptionResult.confidence || 0.8,
          },
        },
      };

      // Update job status to completed
      job.status = "done";
      job.output = finalOutput;
      job.progress = {
        percentage: 100,
        currentPhase: "done",
        phaseProgress: 100,
        estimatedTimeRemaining: 0,
        message: `Processing completed for ${validatedInput.targetLanguage}`,
        stepDetails: {
          currentStep: 4,
          totalSteps: 4,
          stepName: "All tasks completed successfully",
        },
      };
      job.updatedAt = new Date();

      // Step 7: Send webhook notification if configured
      let webhookDelivered = false;
      let webhookResponse = null;

      if (validatedInput.webhookUrl) {
        try {
          webhookResponse = await sendWebhook(validatedInput.webhookUrl, {
            jobId: job.id,
            status: "completed",
            input: job.input,
            output: finalOutput,
            error: null,
            duration,
            targetLanguage: validatedInput.targetLanguage,
            languageConfig: workflowLangConfig,
            timestamp: new Date().toISOString(),
          });
          webhookDelivered = true;
          console.log("Webhook delivered successfully", {
            webhookUrl: validatedInput.webhookUrl,
            targetLanguage: validatedInput.targetLanguage,
          });
        } catch (webhookError) {
          console.error("Webhook delivery failed", {
            webhookUrl: validatedInput.webhookUrl,
            targetLanguage: validatedInput.targetLanguage,
            error:
              webhookError instanceof Error
                ? webhookError.message
                : webhookError,
          });
        }
      }

      // Get job events
      const eventsResult = await renderService.getJobEvents(job.id, {
        limit: 100,
      });

      // Return workflow result
      const result: RenderWorkflowOutput = {
        jobId: job.id,
        status: "completed",
        input: job.input,
        output: finalOutput,
        error: undefined,
        duration,
        events: eventsResult.events,
        webhookDelivered,
        webhookResponse,
      };

      console.log("Workflow completed successfully", {
        jobId: job.id,
        status: result.status,
        duration: result.duration,
        eventsCount: result.events.length,
        targetLanguage: validatedInput.targetLanguage,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const targetLanguage =
        validatedInput?.targetLanguage || payload.targetLanguage || "vi";
      console.error("Render workflow failed", {
        error: error instanceof Error ? error.message : error,
        duration,
        targetLanguage,
        payload,
      });

      // Re-throw with language-specific error context
      const errorMsg = getLanguageErrorMessage(targetLanguage, "processing");
      throw new Error(
        `${errorMsg} after ${duration}ms: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  },
});

// Helper function to send webhook notifications
async function sendWebhook(url: string, data: any): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Trigger.dev-RenderWorkflow/1.0",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `Webhook failed with status ${response.status}: ${response.statusText}`
    );
  }

  return await response.json();
}

// Additional utility task for creating render jobs
export const createRenderJob = task({
  id: "create-render-job",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (
    payload: {
      templateId?: string;
      data: Record<string, any>;
      format?: "pdf" | "html" | "image";
      targetLanguage?: string;
    },
    { ctx }
  ) => {
    console.log("Creating render job", { payload });

    const targetLanguage = payload.targetLanguage || "vi";
    const langConfig =
      LANGUAGE_CONFIG[targetLanguage as keyof typeof LANGUAGE_CONFIG];

    const renderInput: RenderInput = {
      templateId: payload.templateId,
      data: {
        ...payload.data,
        targetLanguage,
        languageConfig: langConfig,
      },
      format: payload.format || "pdf",
      targetLanguage,
      options: {
        targetLanguage,
        languageRules: langConfig.validationRules,
      },
    };

    const job = await renderService.createJob(renderInput);

    console.log("Render job created", {
      jobId: job.id,
      status: job.status,
      targetLanguage,
    });

    return {
      jobId: job.id,
      status: job.status,
      input: job.input,
      targetLanguage,
      languageConfig: langConfig,
    };
  },
});

// Utility task for checking job status
export const checkRenderJobStatus = task({
  id: "check-render-job-status",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: { jobId: string; targetLanguage?: string }, { ctx }) => {
    console.log("Checking render job status", { payload });

    const job = await renderService.getJob(payload.jobId);

    if (!job) {
      const errorMsg = payload.targetLanguage
        ? getLanguageErrorMessage(payload.targetLanguage, "processing") +
          `: Job with ID ${payload.jobId} not found`
        : `Job with ID ${payload.jobId} not found`;
      throw new Error(errorMsg);
    }

    console.log("Job status retrieved", {
      jobId: job.id,
      status: job.status,
      targetLanguage: payload.targetLanguage || job.input.targetLanguage,
    });

    return {
      jobId: job.id,
      status: job.status,
      input: job.input,
      output: job.output,
      error: job.error,
      targetLanguage: job.input.targetLanguage || payload.targetLanguage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  },
});
