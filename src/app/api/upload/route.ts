import { NextRequest, NextResponse } from 'next/server';
import { BlobStorage } from '@/lib/blob-storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use provided filename or generate one
    const finalFilename = filename || file.name;

    // Upload to Blob storage
    const result = await BlobStorage.uploadAuto(buffer, finalFilename);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
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