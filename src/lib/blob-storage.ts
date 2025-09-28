import { put, del, list } from "@vercel/blob";

export interface BlobUploadOptions {
  filename: string;
  contentType: string;
  cacheControlMaxAge?: number;
}

export interface BlobUploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class BlobStorage {
  /**
   * Upload a file to Vercel Blob storage
   */
  static async upload(
    file: Buffer | Blob | string,
    options: BlobUploadOptions
  ): Promise<BlobUploadResult> {
    const blob = await put(options.filename, file, {
      access: "public",
      contentType: options.contentType,
      cacheControlMaxAge: options.cacheControlMaxAge || 31536000, // 1 year default
    });

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      contentType: blob.contentType,
      contentDisposition: blob.contentDisposition,
    };
  }

  /**
   * Delete a file from Vercel Blob storage
   */
  static async delete(url: string): Promise<void> {
    await del(url);
  }

  /**
   * List all blobs in storage
   */
  static async list(prefix?: string) {
    const { blobs } = await list({ prefix });
    return blobs;
  }

  /**
   * Upload a video file with specific options
   */
  static async uploadVideo(
    file: Buffer | Blob,
    filename: string
  ): Promise<BlobUploadResult> {
    return this.upload(file, {
      filename,
      contentType: "video/mp4",
      cacheControlMaxAge: 31536000,
    });
  }

  /**
   * Upload an image file with specific options
   */
  static async uploadImage(
    file: Buffer | Blob,
    filename: string
  ): Promise<BlobUploadResult> {
    return this.upload(file, {
      filename,
      contentType: "image/jpeg",
      cacheControlMaxAge: 31536000,
    });
  }

  /**
   * Upload an audio file with specific options
   */
  static async uploadAudio(
    file: Buffer | Blob,
    filename: string
  ): Promise<BlobUploadResult> {
    return this.upload(file, {
      filename,
      contentType: "audio/mpeg",
      cacheControlMaxAge: 31536000,
    });
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
  }

  /**
   * Get content type based on file extension
   */
  static getContentType(filename: string): string {
    const ext = this.getFileExtension(filename);
    const contentTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };

    return contentTypes[ext] || "application/octet-stream";
  }

  /**
   * Upload file with automatic content type detection
   */
  static async uploadAuto(
    file: Buffer | Blob,
    filename: string
  ): Promise<BlobUploadResult> {
    return this.upload(file, {
      filename,
      contentType: this.getContentType(filename),
      cacheControlMaxAge: 31536000,
    });
  }
}
