import { NextRequest, NextResponse } from 'next/server';
import { renderService } from '@/lib/services/render-service';
import { LanguageSpecificValidators } from '@/lib/validation/language-validators';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { BlobStorage } from '@/lib/blob-storage';

// Language options directly defined to avoid import issues
const languageOptions = [
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
];

// Language-specific validation rules
const LANGUAGE_VALIDATION_RULES = {
  vi: {
    maxDuration: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
    characterLimit: 2000,
    subtitleStyle: 'bottom',
    validation: {
      diacritics: true,
      syllableStructure: true,
      toneDistribution: true
    }
  },
  hi: {
    maxDuration: 12,
    maxFileSize: 55 * 1024 * 1024, // 55MB
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
    characterLimit: 1800,
    subtitleStyle: 'bottom',
    validation: {
      devanagariScript: true,
      aksharaStructure: true,
      characterComposition: true
    }
  },
  fr: {
    maxDuration: 12,
    maxFileSize: 55 * 1024 * 1024, // 55MB
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
    characterLimit: 2200,
    subtitleStyle: 'bottom',
    validation: {
      accents: true,
      punctuation: true,
      guillemets: true
    }
  },
  es: {
    maxDuration: 15,
    maxFileSize: 60 * 1024 * 1024, // 60MB
    supportedFormats: ['mp4', 'webm', 'mov'],
    characterLimit: 2500,
    subtitleStyle: 'bottom',
    validation: {
      accents: true,
      invertedPunctuation: true,
      punctuationMatching: true
    }
  }
};

interface RenderRequestBody {
  templateId?: string;
  data: Record<string, any>;
  format?: 'pdf' | 'html' | 'image';
  options?: Record<string, any>;
  targetLanguage?: string;
  validation?: {
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
  };
}

export async function GET() {
  try {
    const jobs = await renderService.getAllJobs();
    return NextResponse.json({
      message: 'Render jobs fetched successfully',
      jobs
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch render jobs' },
      { status: 500 }
    );
  }
}

function validateTargetLanguage(language: string): { isValid: boolean; error?: string } {
  const supportedLanguageCodes = languageOptions.map(lang => lang.code);

  if (!language) {
    return { isValid: false, error: 'Target language is required' };
  }

  if (!supportedLanguageCodes.includes(language)) {
    return {
      isValid: false,
      error: `Unsupported language: ${language}. Supported languages: ${supportedLanguageCodes.join(', ')}`
    };
  }

  return { isValid: true };
}

function validateLanguageSpecificRules(
  language: string,
  validation?: RenderRequestBody['validation']
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const rules = LANGUAGE_VALIDATION_RULES[language as keyof typeof LANGUAGE_VALIDATION_RULES];

  if (!rules) {
    return { isValid: true, errors: [] };
  }

  // Validate duration
  if (validation?.duration && validation.duration > rules.maxDuration) {
    errors.push(
      `Video duration exceeds maximum allowed for ${language}: ${validation.duration}s > ${rules.maxDuration}s`
    );
  }

  // Validate file size
  if (validation?.fileSize && validation.fileSize > rules.maxFileSize) {
    const maxSizeMB = Math.round(rules.maxFileSize / (1024 * 1024));
    errors.push(
      `File size exceeds maximum allowed for ${language}: ${Math.round(validation.fileSize / (1024 * 1024))}MB > ${maxSizeMB}MB`
    );
  }

  // Validate file format
  if (validation?.mimeType) {
    const format = validation.mimeType.split('/')[1];
    if (!rules.supportedFormats.includes(format)) {
      errors.push(
        `Unsupported format for ${language}: ${format}. Supported formats: ${rules.supportedFormats.join(', ')}`
      );
    }
  }

  // Apply language-specific validation - skip filename validation as it's not relevant for language content
  // Language validation should be applied to the actual content, not the filename

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetLanguage = formData.get('targetLanguage') as string || 'vi';

    // Validate target language
    const languageValidation = validateTargetLanguage(targetLanguage);
    if (!languageValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Language validation failed',
          details: languageValidation.error,
          supportedLanguages: languageOptions.map(lang => ({ code: lang.code, name: lang.name }))
        },
        { status: 400 }
      );
    }

    // Basic validation
    if (!file) {
      return NextResponse.json(
        {
          error: 'No file provided',
          code: 'NO_FILE_PROVIDED'
        },
        { status: 400 }
      );
    }

    // Create validation object for language-specific rules
    const validation = {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    };

    // Apply language-specific validation rules
    const languageSpecificValidation = validateLanguageSpecificRules(
      targetLanguage,
      validation
    );

    if (!languageSpecificValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Language-specific validation failed',
          details: languageSpecificValidation.errors,
          language: targetLanguage,
          validationRules: LANGUAGE_VALIDATION_RULES[targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES]
        },
        { status: 400 }
      );
    }

    // Add language-specific options to the job
    const renderInput = {
      templateId: 'video-render',
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        targetLanguage
      },
      format: 'video' as const,
      targetLanguage,
      validation,
      options: {
        languageRules: LANGUAGE_VALIDATION_RULES[targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES]
      }
    };

    let job;
    try {
      job = await renderService.createJob(renderInput);
      console.log('Job created successfully', { jobId: job.id });
    } catch (error) {
      console.error('Failed to create job:', error);

      // Check if this is a blob storage error (which should be non-fatal)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isBlobError = errorMessage.includes('Vercel Blob') ||
                         errorMessage.includes('suspended') ||
                         errorMessage.includes('BLOB_READ_WRITE_TOKEN');

      if (isBlobError) {
        // For blob storage errors, try to create job without persistent storage
        console.log('Blob storage unavailable, attempting to create job without persistence');
        try {
          // Create a fallback job object
          job = {
            id: crypto.randomUUID(),
            status: 'queued' as const,
            phase: 'queued' as const,
            input: renderInput,
            createdAt: new Date(),
            updatedAt: new Date(),
            progress: {
              percentage: 0,
              currentPhase: 'queued' as const,
              phaseProgress: 0,
              estimatedTimeRemaining: 300,
              message: `Job queued for ${renderInput.targetLanguage || 'vi'} processing`
            },
            events: [],
            metadata: {
              processingLanguages: [renderInput.targetLanguage || 'vi'],
              sourceLanguage: 'auto',
              processingSteps: ['upload', 'transcribe', 'translate', 'synthesize'],
              totalEstimatedTime: 300,
              actualProcessingTime: 0,
              retryCount: 0,
              errorCount: 0,
              warnings: [],
              lastActivity: new Date()
            }
          } as any;
          console.log('Created fallback job without persistent storage', { jobId: job.id });
        } catch (fallbackError) {
          console.error('Failed to create fallback job:', fallbackError);
          return NextResponse.json(
            { error: 'Failed to create job due to storage issues' },
            { status: 503 }
          );
        }
      } else {
        // For non-blob errors, return a proper error response
        return NextResponse.json(
          { error: 'Failed to create job', details: errorMessage },
          { status: 500 }
        );
      }
    }

    // First, upload the file to Blob storage
    console.log('Uploading file to Blob storage...', { fileName: file.name, fileSize: file.size });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let blobUploadResult;

    try {
      blobUploadResult = await BlobStorage.uploadAuto(fileBuffer, `${job.id}_${file.name}`);
      console.log('File uploaded to Blob storage', {
        url: blobUploadResult.url,
        downloadUrl: blobUploadResult.downloadUrl,
        pathname: blobUploadResult.pathname
      });
    } catch (blobError) {
      console.error('Failed to upload file to Blob storage:', blobError);
      // Continue with local storage only - this is non-fatal
      blobUploadResult = {
        url: '',
        downloadUrl: '',
        pathname: ''
      };
    }

    // Also save a local copy for fallback
    const uploadsDir = join(process.cwd(), 'public', 'uploads', job.id);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    const localFilePath = join(uploadsDir, file.name);
    await writeFile(localFilePath, fileBuffer);

    // Add a small delay to ensure job is properly saved before returning
    await new Promise(resolve => setTimeout(resolve, 500));

    // Trigger the actual workflow for processing with download configuration
    try {
      const workflowPayload = {
        jobId: job.id,
        templateId: 'video-render',
        data: {
          ...renderInput.data,
          fileName: validation.fileName,
          mimeType: validation.mimeType,
          blobUrl: blobUploadResult.downloadUrl, // Add blob URL for download task
          localFilePath: `/uploads/${job.id}/${file.name}` // Local fallback
        },
        format: 'video',
        options: {
          languageRules: LANGUAGE_VALIDATION_RULES[targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES],
          targetLanguage
        },
        targetLanguage,
        timeout: 300,
        // Configure download task
        downloadConfig: {
          enabled: true,
          url: blobUploadResult.downloadUrl,
          filename: file.name,
          maxRetries: 3,
          timeout: 60,
          validateContentType: true
        }
      };

      const workflowResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workflows/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowPayload),
      });

      if (!workflowResponse.ok) {
        const errorData = await workflowResponse.json();
        console.error('Failed to trigger workflow:', errorData);

        // Don't fail the job creation, just log the error
        // The job will be created but the workflow won't run
        await renderService.addEvent(
          job.id,
          'job_failed',
          'failed',
          {
            type: 'workflow_trigger_failed',
            error: errorData.error || 'Unknown workflow trigger error',
            workflowPayload
          },
          {
            severity: 'error',
            category: 'processing',
            tags: ['workflow', 'trigger', 'error']
          }
        );
      } else {
        const workflowResult = await workflowResponse.json();
        console.log('Workflow triggered successfully:', workflowResult);

        // Add workflow trigger event
        await renderService.addEvent(
          job.id,
          'job_progress',
          'rendering',
          {
            type: 'workflow_triggered',
            runId: workflowResult.runId,
            taskId: workflowResult.taskId,
            status: workflowResult.status
          },
          {
            severity: 'info',
            category: 'processing',
            tags: ['workflow', 'trigger', 'started']
          }
        );
      }
    } catch (workflowError) {
      console.error('Error triggering workflow:', workflowError);

      // Don't fail the job creation, just log the error
      await renderService.addEvent(
        job.id,
        'job_failed',
        'failed',
        {
          type: 'workflow_trigger_exception',
          error: workflowError instanceof Error ? workflowError.message : 'Unknown workflow trigger exception'
        },
        {
          severity: 'error',
          category: 'processing',
          tags: ['workflow', 'trigger', 'exception']
        }
      );
    }

    return NextResponse.json({
      message: 'Render job created successfully',
      jobId: job.id,
      job,
      language: targetLanguage,
      validationRules: LANGUAGE_VALIDATION_RULES[targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES]
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create render job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}