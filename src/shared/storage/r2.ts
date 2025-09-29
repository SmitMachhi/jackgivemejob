/* eslint-disable no-unused-vars */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

export interface R2FileMetadata {
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

class R2Storage {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
    this.publicUrl =
      config.publicUrl ||
      `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      throw new R2Error("Failed to generate signed URL", error);
    }
  }

  async uploadToR2(
    key: string,
    file: Buffer,
    contentType: string
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await this.client.send(command);
    } catch (error) {
      throw new R2Error("Failed to upload file to R2", error);
    }
  }

  async getR2FileMetadata(key: string): Promise<R2FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || "application/octet-stream",
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || "",
      };
    } catch (error) {
      throw new R2Error("Failed to get file metadata from R2", error);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  generateKey(fileName: string, prefix: string = "uploads"): string {
    const extension = fileName.split(".").pop();
    const uniqueId = uuidv4();
    return `${prefix}/${uniqueId}.${extension}`;
  }
}

export class R2Error extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "R2Error";

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, R2Error);
    }
  }

  get fullMessage(): string {
    if (this.cause && this.cause instanceof Error) {
      return `${this.message} (caused by: ${this.cause.message})`;
    }
    return this.message;
  }
}

let r2Instance: R2Storage | null = null;

export function getR2Storage(): R2Storage {
  if (!r2Instance) {
    const config: R2Config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    };

    if (
      !config.accountId ||
      !config.accessKeyId ||
      !config.secretAccessKey ||
      !config.bucketName
    ) {
      throw new R2Error(
        "Missing required R2 configuration in environment variables"
      );
    }

    r2Instance = new R2Storage(config);
  }

  return r2Instance;
}

export { R2Storage };