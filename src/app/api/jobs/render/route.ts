import { NextRequest, NextResponse } from 'next/server';
import { renderService } from '@/lib/services/render-service';
import { languageOptions } from '@/app/components/LanguageSelector';

// Language-specific validation rules
const LANGUAGE_VALIDATION_RULES = {
  vi: {
    maxDuration: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
    characterLimit: 2000,
    subtitleStyle: 'bottom'
  },
  es: {
    maxDuration: 15,
    maxFileSize: 60 * 1024 * 1024, // 60MB
    supportedFormats: ['mp4', 'webm', 'mov'],
    characterLimit: 2500,
    subtitleStyle: 'bottom'
  },
  fr: {
    maxDuration: 12,
    maxFileSize: 55 * 1024 * 1024, // 55MB
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
    characterLimit: 2200,
    subtitleStyle: 'bottom'
  },
  de: {
    maxDuration: 14,
    maxFileSize: 58 * 1024 * 1024, // 58MB
    supportedFormats: ['mp4', 'webm', 'mov'],
    characterLimit: 2400,
    subtitleStyle: 'bottom'
  },
  ja: {
    maxDuration: 8, // Japanese needs shorter duration due to character density
    maxFileSize: 45 * 1024 * 1024, // 45MB
    supportedFormats: ['mp4', 'webm', 'mov'],
    characterLimit: 1500, // Japanese characters take more space
    subtitleStyle: 'top' // Japanese subtitles typically at top
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

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequestBody = await request.json();

    // Validate target language
    const languageValidation = validateTargetLanguage(body.targetLanguage || 'vi');
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

    // Apply language-specific validation rules
    const languageSpecificValidation = validateLanguageSpecificRules(
      body.targetLanguage || 'vi',
      body.validation
    );

    if (!languageSpecificValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Language-specific validation failed',
          details: languageSpecificValidation.errors,
          language: body.targetLanguage,
          validationRules: LANGUAGE_VALIDATION_RULES[body.targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES]
        },
        { status: 400 }
      );
    }

    // Add language-specific options to the job
    const renderInput = {
      ...body,
      targetLanguage: body.targetLanguage || 'vi',
      options: {
        ...body.options,
        languageRules: LANGUAGE_VALIDATION_RULES[body.targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES]
      }
    };

    const job = await renderService.createJob(renderInput);

    return NextResponse.json({
      message: 'Render job created successfully',
      job,
      language: body.targetLanguage,
      validationRules: LANGUAGE_VALIDATION_RULES[body.targetLanguage as keyof typeof LANGUAGE_VALIDATION_RULES]
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