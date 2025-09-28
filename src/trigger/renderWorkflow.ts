import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { renderService, RenderInput, JobEvent } from "@/lib/services/render-service";
import { languageOptions } from "@/app/components/LanguageSelector";

// Language-specific configuration
const LANGUAGE_CONFIG = {
  vi: {
    retry: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true
    },
    timeout: 300,
    validationRules: {
      maxDuration: 10,
      maxFileSize: 50 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov", "avi"]
    }
  },
  es: {
    retry: {
      maxAttempts: 3,
      minTimeoutInMs: 2500,
      maxTimeoutInMs: 35000,
      factor: 2,
      randomize: true
    },
    timeout: 360,
    validationRules: {
      maxDuration: 15,
      maxFileSize: 60 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov"]
    }
  },
  fr: {
    retry: {
      maxAttempts: 3,
      minTimeoutInMs: 2200,
      maxTimeoutInMs: 32000,
      factor: 2,
      randomize: true
    },
    timeout: 330,
    validationRules: {
      maxDuration: 12,
      maxFileSize: 55 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov", "avi"]
    }
  },
  de: {
    retry: {
      maxAttempts: 4,
      minTimeoutInMs: 2800,
      maxTimeoutInMs: 38000,
      factor: 2,
      randomize: true
    },
    timeout: 390,
    validationRules: {
      maxDuration: 14,
      maxFileSize: 58 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov"]
    }
  },
  ja: {
    retry: {
      maxAttempts: 4,
      minTimeoutInMs: 3000,
      maxTimeoutInMs: 40000,
      factor: 2,
      randomize: true
    },
    timeout: 420,
    validationRules: {
      maxDuration: 8,
      maxFileSize: 45 * 1024 * 1024,
      supportedFormats: ["mp4", "webm", "mov"]
    }
  }
};

// Input validation schema for the render workflow
export const RenderWorkflowSchema = z.object({
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),
  templateId: z.string().optional(),
  data: z.record(z.any()).default({}),
  format: z.enum(["pdf", "html", "image"]).default("pdf"),
  options: z.record(z.any()).optional().default({}),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  webhookUrl: z.string().url("Webhook URL must be valid").optional(),
  timeout: z.number().positive().min(30).max(3600).default(300), // 5 minutes default
  retryAttempts: z.number().min(0).max(5).default(2),
  // Language support
  targetLanguage: z.enum(["vi", "es", "fr", "de", "ja"]).default("vi"),
  // Download configuration
  downloadConfig: z.object({
    enabled: z.boolean().default(false),
    url: z.string().url().optional(),
    filename: z.string().optional(),
    maxRetries: z.number().min(0).max(10).default(3),
    timeout: z.number().positive().min(5).max(300).default(60),
    validateContentType: z.boolean().default(true),
  }).optional().default({ enabled: false }),
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
function validateLanguageConstraints(input: RenderWorkflowInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const supportedLanguages = languageOptions.map(lang => lang.code);

  // Check if language is supported
  if (!supportedLanguages.includes(input.targetLanguage)) {
    errors.push(`Unsupported language: ${input.targetLanguage}. Supported: ${supportedLanguages.join(', ')}`);
  }

  // Check if timeout is within reasonable limits for the language
  const langConfig = LANGUAGE_CONFIG[input.targetLanguage];
  if (input.timeout > langConfig.timeout * 2) {
    errors.push(`Timeout too long for ${input.targetLanguage}: ${input.timeout}s > ${langConfig.timeout * 2}s`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to get language-specific error message
function getLanguageErrorMessage(language: string, errorType: string): string {
  const messages = {
    vi: {
      timeout: "Xử lý tiếng Việt đang mất nhiều thời gian hơn dự kiến",
      validation: "Xác thực video tiếng Việt thất bại",
      processing: "Lỗi xử lý tiếng Việt"
    },
    es: {
      timeout: "El procesamiento en español está tardando más de lo esperado",
      validation: "La validación del video en español falló",
      processing: "Error de procesamiento en español"
    },
    fr: {
      timeout: "Le traitement en français prend plus de temps que prévu",
      validation: "La validation vidéo en français a échoué",
      processing: "Erreur de traitement en français"
    },
    de: {
      timeout: "Die deutsche Verarbeitung dauert länger als erwartet",
      validation: "Validierung des deutschen Videos fehlgeschlagen",
      processing: "Fehler bei der deutschen Verarbeitung"
    },
    ja: {
      timeout: "日本語の処理に予想以上に時間がかかっています",
      validation: "日本語動画の検証に失敗しました",
      processing: "日本語処理エラー"
    }
  };

  return messages[language as keyof typeof messages]?.[errorType as keyof typeof messages.vi] || `${errorType} error for ${language}`;
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
        config: workflowLangConfig
      });

      // Validate language-specific constraints
      const languageValidation = validateLanguageConstraints(validatedInput);
      if (!languageValidation.isValid) {
        throw new Error(`Language validation failed for ${validatedInput.targetLanguage}: ${languageValidation.errors.join(', ')}`);
      }

      // Step 1: Create or retrieve job with language support
      let job;
      if (validatedInput.jobId) {
        job = await renderService.getJob(validatedInput.jobId);
        if (!job) {
          throw new Error(`Job with ID ${validatedInput.jobId} not found`);
        }
        console.log("Retrieved existing job", { jobId: job.id, status: job.status });
      } else {
        const renderInput: RenderInput = {
          templateId: validatedInput.templateId,
          data: {
            ...validatedInput.data,
            targetLanguage: validatedInput.targetLanguage,
            languageConfig: workflowLangConfig
          },
          format: validatedInput.format,
          options: {
            ...validatedInput.options,
            targetLanguage: validatedInput.targetLanguage,
            languageRules: workflowLangConfig.validationRules
          },
          targetLanguage: validatedInput.targetLanguage,
        };
        job = await renderService.createJob(renderInput);
        console.log("Created new job", { jobId: job.id, targetLanguage: validatedInput.targetLanguage });
      }

      // Step 2: Wait for job completion with language-specific timeout
      const langConfig = LANGUAGE_CONFIG[validatedInput.targetLanguage as keyof typeof LANGUAGE_CONFIG];
      const effectiveTimeout = Math.min(validatedInput.timeout, langConfig.timeout);
      const timeoutMs = effectiveTimeout * 1000;
      const pollInterval = 2000; // 2 seconds
      const maxAttempts = Math.floor(timeoutMs / pollInterval);
      let attempts = 0;

      console.log("Starting job polling", {
        jobId: job.id,
        targetLanguage: validatedInput.targetLanguage,
        effectiveTimeout,
        timeoutMs,
        maxAttempts
      });

      while (attempts < maxAttempts) {
        const currentJob = await renderService.getJob(job.id);
        if (!currentJob) {
          const errorMsg = getLanguageErrorMessage(validatedInput.targetLanguage, "processing") + `: Job ${job.id} disappeared during processing`;
          throw new Error(errorMsg);
        }

        console.log("Polling job status", {
          jobId: job.id,
          status: currentJob.status,
          targetLanguage: validatedInput.targetLanguage,
          attempt: attempts + 1,
          maxAttempts
        });

        // Check if job is completed or failed
        if (currentJob.status === "completed" || currentJob.status === "failed") {
          const duration = Date.now() - startTime;

          console.log("Job finished", {
            jobId: job.id,
            status: currentJob.status,
            duration,
            hasOutput: !!currentJob.output,
            hasError: !!currentJob.error
          });

          // Step 3: Send webhook notification if configured
          let webhookDelivered = false;
          let webhookResponse = null;

          if (validatedInput.webhookUrl) {
            try {
              webhookResponse = await sendWebhook(validatedInput.webhookUrl, {
                jobId: job.id,
                status: currentJob.status,
                input: currentJob.input,
                output: currentJob.output,
                error: currentJob.error,
                duration,
                targetLanguage: validatedInput.targetLanguage,
                languageConfig: langConfig,
                timestamp: new Date().toISOString(),
              });
              webhookDelivered = true;
              console.log("Webhook delivered successfully", {
                webhookUrl: validatedInput.webhookUrl,
                targetLanguage: validatedInput.targetLanguage
              });
            } catch (webhookError) {
              console.error("Webhook delivery failed", {
                webhookUrl: validatedInput.webhookUrl,
                targetLanguage: validatedInput.targetLanguage,
                error: webhookError instanceof Error ? webhookError.message : webhookError
              });
            }
          }

          // Get job events
          const eventsResult = await renderService.getJobEvents(job.id, { limit: 100 });

          // Return workflow result
          const result: RenderWorkflowOutput = {
            jobId: job.id,
            status: currentJob.status,
            input: currentJob.input,
            output: currentJob.output,
            error: currentJob.error,
            duration,
            events: eventsResult.events,
            webhookDelivered,
            webhookResponse,
          };

          console.log("Workflow completed successfully", {
            jobId: job.id,
            status: result.status,
            duration: result.duration,
            eventsCount: result.events.length
          });

          return result;
        }

        // Wait before next poll using Trigger.dev wait function
        await wait.for({ seconds: pollInterval / 1000 });
        attempts++;
      }

      // Timeout reached with language-specific error message
      const timeoutErrorMsg = getLanguageErrorMessage(validatedInput.targetLanguage, "timeout") + `: Job ${job.id} did not complete within ${effectiveTimeout} seconds`;
      throw new Error(timeoutErrorMsg);

    } catch (error) {
      const duration = Date.now() - startTime;
      const targetLanguage = validatedInput?.targetLanguage || payload.targetLanguage || "vi";
      console.error("Render workflow failed", {
        error: error instanceof Error ? error.message : error,
        duration,
        targetLanguage,
        payload
      });

      // Re-throw with language-specific error context
      const errorMsg = getLanguageErrorMessage(targetLanguage, "processing");
      throw new Error(`${errorMsg} after ${duration}ms: ${error instanceof Error ? error.message : error}`);
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
    throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
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
  run: async (payload: {
    templateId?: string;
    data: Record<string, any>;
    format?: "pdf" | "html" | "image";
    targetLanguage?: string;
  }, { ctx }) => {
    console.log("Creating render job", { payload });

    const targetLanguage = payload.targetLanguage || "vi";
    const langConfig = LANGUAGE_CONFIG[targetLanguage as keyof typeof LANGUAGE_CONFIG];

    const renderInput: RenderInput = {
      templateId: payload.templateId,
      data: {
        ...payload.data,
        targetLanguage,
        languageConfig: langConfig
      },
      format: payload.format || "pdf",
      targetLanguage,
      options: {
        targetLanguage,
        languageRules: langConfig.validationRules
      }
    };

    const job = await renderService.createJob(renderInput);

    console.log("Render job created", {
      jobId: job.id,
      status: job.status,
      targetLanguage
    });

    return {
      jobId: job.id,
      status: job.status,
      input: job.input,
      targetLanguage,
      languageConfig: langConfig
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
        ? getLanguageErrorMessage(payload.targetLanguage, "processing") + `: Job with ID ${payload.jobId} not found`
        : `Job with ID ${payload.jobId} not found`;
      throw new Error(errorMsg);
    }

    console.log("Job status retrieved", {
      jobId: job.id,
      status: job.status,
      targetLanguage: payload.targetLanguage || job.input.targetLanguage
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

// Download task schemas
export const DownloadTaskSchema = z.object({
  url: z.string().url("Invalid URL provided"),
  filename: z.string().min(1, "Filename is required").optional(),
  jobId: z.string().uuid("Job ID must be a valid UUID").optional(),
  targetLanguage: z.enum(["vi", "es", "fr", "de", "ja"]).default("vi"),
  maxRetries: z.number().min(0).max(10).default(3),
  timeout: z.number().positive().min(5).max(300).default(60), // seconds
  chunkSize: z.number().positive().min(1024).max(10485760).default(524288), // 512KB default
  validateContentType: z.boolean().default(true),
  allowedContentTypes: z.array(z.string()).default([
    "application/pdf",
    "text/html",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/json",
    "text/plain"
  ]),
});

export type DownloadTaskInput = z.infer<typeof DownloadTaskSchema>;

export const DownloadTaskOutputSchema = z.object({
  success: z.boolean(),
  filename: z.string(),
  filePath: z.string(),
  fileSize: z.number(),
  contentType: z.string(),
  downloadTime: z.number(),
  retries: z.number(),
  metadata: z.object({
    etag: z.string().optional(),
    lastModified: z.string().optional(),
    contentLength: z.number().optional(),
    url: z.string(),
    downloadedAt: z.string(),
  }),
});

export type DownloadTaskOutput = z.infer<typeof DownloadTaskOutputSchema>;

/**
 * Download Task - Downloads files from URLs with progress tracking and retry logic
 *
 * This task handles secure file downloads with:
 * - URL validation and security checks
 * - Progress tracking and reporting
 * - Retry logic with exponential backoff
 * - Content type validation
 * - Temporary file management
 */
export const downloadTask = task({
  id: "download-task",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: DownloadTaskInput, { ctx }) => {
    const startTime = Date.now();
    console.log("Starting download task", { payload });

    try {
      // Validate input
      const validatedInput = DownloadTaskSchema.parse(payload);
      console.log("Download input validated", { validatedInput });

      // Get language-specific configuration for download
      const langConfig = LANGUAGE_CONFIG[validatedInput.targetLanguage];
      console.log("Language download configuration loaded", {
        targetLanguage: validatedInput.targetLanguage,
        config: langConfig
      });

      // Parse and validate URL
      const parsedUrl = new URL(validatedInput.url);

      // Security checks
      if (!isUrlAllowed(parsedUrl)) {
        throw new Error(`URL not allowed: ${validatedInput.url}`);
      }

      console.log("URL validation passed", {
        url: validatedInput.url,
        hostname: parsedUrl.hostname,
        protocol: parsedUrl.protocol
      });

      // Generate filename if not provided
      const filename = validatedInput.filename || generateFilename(parsedUrl);
      const tempDir = process.env.TEMP_DIR || '/tmp';
      const filePath = `${tempDir}/${filename}`;

      console.log("Download parameters set", {
        filename,
        filePath,
        tempDir,
        chunkSize: validatedInput.chunkSize,
        timeout: validatedInput.timeout
      });

      // Attempt download with language-specific retry logic
      const result = await downloadWithRetry(
        validatedInput.url,
        filePath,
        {
          maxRetries: Math.max(validatedInput.maxRetries, langConfig.retry.maxAttempts),
          timeout: Math.min(validatedInput.timeout * 1000, langConfig.retry.maxTimeoutInMs),
          chunkSize: validatedInput.chunkSize,
          validateContentType: validatedInput.validateContentType,
          allowedContentTypes: validatedInput.allowedContentTypes,
          logger: console,
          jobId: validatedInput.jobId,
          targetLanguage: validatedInput.targetLanguage,
          retryConfig: langConfig.retry
        }
      );

      const downloadTime = Date.now() - startTime;

      console.log("Download completed successfully", {
        filename: result.filename,
        fileSize: result.fileSize,
        downloadTime,
        retries: result.retries,
        filePath: result.filePath
      });

      // Emit download event if jobId is provided
      if (validatedInput.jobId) {
        await renderService.addEvent(
          validatedInput.jobId,
          'job_progress',
          'processing',
          {
            type: 'download_completed',
            filename: result.filename,
            fileSize: result.fileSize,
            downloadTime,
            retries: result.retries,
            url: validatedInput.url,
            filePath: result.filePath
          },
          {
            severity: 'success',
            category: 'processing',
            tags: ['download', 'file_processing']
          }
        );
      }

      return {
        ...result,
        downloadTime,
        metadata: {
          ...result.metadata,
          downloadedAt: new Date().toISOString(),
        }
      };

    } catch (error) {
      const downloadTime = Date.now() - startTime;
      console.error("Download task failed", {
        error: error instanceof Error ? error.message : error,
        duration: downloadTime,
        payload
      });

      // Emit failure event if jobId is provided
      if (payload.jobId) {
        await renderService.addEvent(
          payload.jobId,
          'job_progress',
          'processing',
          {
            type: 'download_failed',
            url: payload.url,
            error: error instanceof Error ? error.message : error,
            downloadTime,
            retries: payload.maxRetries
          },
          {
            severity: 'error',
            category: 'processing',
            tags: ['download', 'error', 'failure']
          }
        ).catch(eventError => {
          console.warn("Failed to emit download failure event", { eventError });
        });
      }

      throw new Error(`Download failed after ${downloadTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  },
});

// Helper function to validate URLs
function isUrlAllowed(url: URL): boolean {
  const disallowedProtocols = ['javascript:', 'data:', 'file:', 'ftp:'];
  const disallowedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];

  if (disallowedProtocols.includes(url.protocol)) {
    return false;
  }

  if (disallowedHosts.includes(url.hostname)) {
    return false;
  }

  // Allow HTTP/HTTPS only
  return url.protocol === 'http:' || url.protocol === 'https:';
}

// Helper function to generate filename from URL
function generateFilename(url: URL): string {
  const pathname = url.pathname;
  const basename = pathname.split('/').pop() || 'download';

  // Add extension if missing
  if (!basename.includes('.')) {
    const extension = url.pathname.match(/\.(jpg|jpeg|png|gif|pdf|html|txt|json)$/i)?.[1] || 'bin';
    return `${basename}.${extension}`;
  }

  // Sanitize filename
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Download function with retry logic
async function downloadWithRetry(
  url: string,
  filePath: string,
  options: {
    maxRetries: number;
    timeout: number;
    chunkSize: number;
    validateContentType: boolean;
    allowedContentTypes: string[];
    logger: any;
    jobId?: string;
    targetLanguage?: string;
    retryConfig?: {
      maxAttempts: number;
      minTimeoutInMs: number;
      maxTimeoutInMs: number;
      factor: number;
      randomize: boolean;
    };
  }
): Promise<DownloadTaskOutput> {
  const { maxRetries, timeout, chunkSize, validateContentType, allowedContentTypes, logger, jobId, targetLanguage, retryConfig } = options;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    console.log(`Download attempt ${attempt}/${maxRetries + 1}`, { url, filePath });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Trigger.dev-DownloadTask/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Validate content type if required
      const contentType = response.headers.get('content-type')?.split(';')[0] || '';
      if (validateContentType && !allowedContentTypes.includes(contentType)) {
        throw new Error(`Content type not allowed: ${contentType}`);
      }

      // Get file size
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      console.log("Download request successful", {
        status: response.status,
        contentType,
        contentLength,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Create write stream and start download
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Write to file (in Node.js environment)
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, buffer);

      const fileSize = buffer.length;

      console.log("File downloaded successfully", {
        filePath,
        fileSize,
        contentType,
        contentLength,
        actualSize: fileSize
      });

      return {
        success: true,
        filename: filePath.split('/').pop() || 'downloaded_file',
        filePath,
        fileSize,
        contentType,
        downloadTime: 0, // Will be set by caller
        retries: attempt - 1,
        metadata: {
          etag: response.headers.get('etag') || undefined,
          lastModified: response.headers.get('last-modified') || undefined,
          contentLength,
          url,
          downloadedAt: new Date().toISOString(),
        }
      };

    } catch (error) {
      console.error(`Download attempt ${attempt} failed`, {
        error: error instanceof Error ? error.message : error,
        url,
        attempt
      });

      // Emit progress event if jobId is provided
      if (jobId) {
        await renderService.addEvent(
          jobId,
          'job_progress',
          'processing',
          {
            type: 'download_retry',
            url,
            attempt,
            maxAttempts: maxRetries + 1,
            error: error instanceof Error ? error.message : error
          },
          {
            severity: 'warning',
            category: 'processing',
            tags: ['download', 'retry']
          }
        ).catch(eventError => {
          console.warn("Failed to emit download retry event", { eventError });
        });
      }

      // If this is the last attempt, re-throw the error
      if (attempt > maxRetries) {
        throw error;
      }

      // Calculate language-specific exponential backoff delay
      const baseDelay = retryConfig?.minTimeoutInMs || 1000;
      const maxDelay = retryConfig?.maxTimeoutInMs || 30000;
      const factor = retryConfig?.factor || 2;
      const randomize = retryConfig?.randomize || true;

      let delay = Math.min(baseDelay * Math.pow(factor, attempt - 1), maxDelay);

      // Add randomization if enabled
      if (randomize) {
        delay = delay * (0.8 + Math.random() * 0.4); // ±20% variation
      }

      console.log(`Waiting ${delay}ms before retry`, {
        attempt,
        delay,
        targetLanguage,
        baseDelay,
        maxDelay
      });

      await wait.for({ seconds: delay / 1000 });
    }
  }

  throw new Error('Maximum retry attempts exceeded');
}

