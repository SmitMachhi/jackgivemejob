import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { simpleVideoProcess } from '@/trigger/simpleVideoWorkflow';

export async function POST(request: NextRequest) {
  try {
    console.log('Simple upload route called');

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const targetLanguage = formData.get('targetLanguage') as string || 'vi';
    const userId = formData.get('userId') as string || 'anonymous';

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    console.log('Processing video upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      targetLanguage,
    });

    // Step 1: Upload the video to blob storage
    console.log('Uploading video to blob storage...');
    const blobResult = await put(file.name, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: true,
    });

    console.log('Video uploaded to blob storage', {
      url: blobResult.url,
      downloadUrl: blobResult.downloadUrl,
    });

    // Step 2: Trigger the video processing workflow
    console.log('Triggering video processing workflow...');
    const workflowPayload = {
      videoUrl: blobResult.url,
      fileName: file.name,
      targetLanguage: targetLanguage as "es" | "fr" | "hi" | "vi",
      userId,
    };

    const workflowResult = await simpleVideoProcess.trigger(workflowPayload);

    console.log('Video processing workflow triggered', {
      id: workflowResult.id,
    });

    // Step 3: Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Video uploaded and processing started',
      videoUrl: blobResult.url,
      jobId: workflowResult.id,
      runId: workflowResult.id,
      status: 'processing',
      targetLanguage,
      checkStatusUrl: `/api/status/${workflowResult.id}`,
    });

  } catch (error) {
    console.error('Error in simple upload route:', error);

    return NextResponse.json(
      {
        error: 'Failed to process video upload',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}