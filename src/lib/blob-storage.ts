import { put, del, list } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

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

  /**
   * Download file from Blob URL to local filesystem
   */
  static async downloadFromBlob(blobUrl: string, jobId: string): Promise<string> {
    try {
      // Create temporary directory for the job if it doesn't exist
      const tempDir = path.join(process.cwd(), "temp", jobId);
      await fs.mkdir(tempDir, { recursive: true });

      // Extract filename from blob URL or generate one
      const url = new URL(blobUrl);
      const pathname = url.pathname;
      const filename = path.basename(pathname) || `file_${jobId}_${Date.now()}`;
      const filePath = path.join(tempDir, filename);

      console.log("Downloading file from blob", {
        blobUrl,
        jobId,
        filePath,
      });

      // Download the file
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      // Get file as buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Write to local file system
      await fs.writeFile(filePath, buffer);

      console.log("File downloaded successfully", {
        blobUrl,
        jobId,
        filePath,
        fileSize: buffer.length,
        contentType: response.headers.get("content-type"),
      });

      return filePath;
    } catch (error) {
      console.error("Error downloading file from blob", {
        blobUrl,
        jobId,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Failed to download file from blob: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Clean up temporary files for a job
   */
  static async cleanupJobFiles(jobId: string): Promise<void> {
    try {
      const tempDir = path.join(process.cwd(), "temp", jobId);
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log("Cleaned up job files", { jobId, tempDir });
    } catch (error) {
      console.warn("Failed to clean up job files", {
        jobId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
