import { NextRequest, NextResponse } from 'next/server';
import { BlobStorage } from '@/lib/blob-storage';
import { VideoValidator, VideoValidationError, VALIDATION_ERROR_MESSAGES } from '@/lib/validation/video-validator';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;
    const targetLanguage = formData.get('targetLanguage') as string || 'en';
    const enableLanguageDetection = formData.get('enableLanguageDetection') === 'true';

    console.log('Upload request received', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      filename,
      targetLanguage,
      enableLanguageDetection
    });

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

    // Initialize video validator
    const validator = new VideoValidator(
      process.env.OPENAI_API_KEY,
      (message, data) => {
        console.log(`[VideoValidator] ${message}`, data);
      }
    );

    // Perform comprehensive video validation
    const validationResult = await validator.validateVideo(file, {
      targetLanguage,
      enableLanguageDetection,
      strictMode: true
    });

    console.log('Validation result', {
      isValid: validationResult.isValid,
      errorsCount: validationResult.errors.length,
      warningsCount: validationResult.warnings?.length || 0,
      processingTime: validationResult.processingTime
    });

    // If validation fails, return detailed error information
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Video validation failed',
          code: 'VALIDATION_FAILED',
          details: {
            errors: validationResult.errors.map(err => ({
              code: err.code,
              message: err.message,
              details: err.details
            })),
            warnings: validationResult.warnings,
            metadata: validationResult.metadata,
            processingTime: validationResult.processingTime
          }
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use provided filename or generate one
    const finalFilename = filename || file.name;

    // Upload to Blob storage
    const uploadResult = await BlobStorage.uploadAuto(buffer, finalFilename);

    const totalProcessingTime = Date.now() - startTime;

    console.log('Upload completed successfully', {
      fileName: finalFilename,
      fileSize: file.size,
      processingTime: totalProcessingTime,
      validationResult: {
        isValid: validationResult.isValid,
        hasMetadata: !!validationResult.metadata,
        hasLanguageDetection: !!validationResult.languageDetection,
        warningsCount: validationResult.warnings?.length || 0
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        upload: uploadResult,
        validation: {
          isValid: validationResult.isValid,
          metadata: validationResult.metadata,
          languageDetection: validationResult.languageDetection,
          warnings: validationResult.warnings,
          processingTime: validationResult.processingTime
        },
        totalProcessingTime
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Upload error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    return NextResponse.json(
      {
        error: 'Upload failed',
        code: 'UPLOAD_FAILED',
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          processingTime
        }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // List all blobs
    const blobs = await BlobStorage.list();

    return NextResponse.json({
      success: true,
      data: blobs,
    });
  } catch (error) {
    console.error('List blobs error:', error);
    return NextResponse.json(
      { error: 'Failed to list blobs' },
      { status: 500 }
    );
  }
}