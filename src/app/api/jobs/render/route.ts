import { NextRequest, NextResponse } from "next/server";

import {
  getClientIP,
  generateJobId,
  addActiveJob,
  removeActiveJob,
  checkConcurrencyLimits,
  getActiveJobsDebug,
} from "@/shared/utils";

// Import the in-memory stores from the job status endpoint
const jobStatusStore = new Map<
  string,
  {
    status: "queued" | "running" | "failed" | "done";
    outputUrl?: string;
    reason?: string;
    createdAt: Date;
  }
>();

const jobEventsStore = new Map<
  string,
  Array<{
    id: string;
    type: string;
    timestamp: Date;
    data?: Record<string, any>;
  }>
>();

interface RenderJobRequest {
  r2Key: string;
  targetLang: "vi";
}

// Helper function to validate R2 file
async function validateR2File(
  r2Key: string
): Promise<{ valid: boolean; error?: string; size?: number }> {
  try {
    // Validate r2Key format
    if (!r2Key.startsWith("uploads/")) {
      return { valid: false, error: 'r2Key must start with "uploads/"' };
    }

    // Check file size via R2 HEAD request
    const r2Url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${r2Key}`;

    const response = await fetch(r2Url, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${process.env.R2_SECRET_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      return { valid: false, error: "File not found in R2 storage" };
    }

    const contentLength = response.headers.get("content-length");
    const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

    if (fileSize > 50 * 1024 * 1024) {
      // 50MB
      return { valid: false, error: "File size exceeds 50MB limit" };
    }

    return { valid: true, size: fileSize };
  } catch {
    return { valid: false, error: "Failed to validate file in R2 storage" };
  }
}

// Helper function to call Trigger.dev endpoint
async function callTriggerDev(
  jobId: string,
  r2Key: string,
  targetLang: string
): Promise<{ runId: string; error?: string }> {
  try {
    const triggerUrl = `${
      process.env.TRIGGER_API_URL || "https://api.trigger.dev"
    }/api/v1/jobs/render`;

    const response = await fetch(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
      },
      body: JSON.stringify({
        jobId,
        r2Key,
        targetLang,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { runId: "", error: errorData.message || "Failed to trigger job" };
    }

    const data = await response.json();
    return { runId: data.runId };
  } catch {
    return { runId: "", error: "Failed to connect to Trigger.dev" };
  }
}

// Helper function to validate request body
function validateRequestBody(body: RenderJobRequest): {
  valid: boolean;
  error?: string;
} {
  if (!body.r2Key || !body.targetLang) {
    return {
      valid: false,
      error: "Missing required fields: r2Key and targetLang",
    };
  }

  if (body.targetLang !== "vi") {
    return {
      valid: false,
      error: "Currently only Vietnamese (vi) target language is supported",
    };
  }

  return { valid: true };
}

async function validateJobRequest(
  body: RenderJobRequest,
  clientIP: string
): Promise<NextResponse | null> {
  // Validate request body
  const validation = validateRequestBody(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Validate R2 file
  const r2Validation = await validateR2File(body.r2Key);
  if (!r2Validation.valid) {
    return NextResponse.json(
      { error: r2Validation.error },
      { status: r2Validation.error?.includes("exceeds") ? 413 : 400 }
    );
  }

  // Check concurrency limits
  const concurrencyCheck = checkConcurrencyLimits(clientIP);
  if (!concurrencyCheck.valid) {
    return NextResponse.json(
      { error: concurrencyCheck.error },
      { status: 429 }
    );
  }

  return null;
}

async function processRenderJob(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as RenderJobRequest;
  const clientIP = getClientIP(request);

  // Validate all aspects of the request
  const validationResult = await validateJobRequest(body, clientIP);
  if (validationResult) {
    return validationResult;
  }

  // Generate job ID and add to active jobs
  const jobId = generateJobId();
  addActiveJob(jobId, clientIP);

  // Add job to status store with "queued" status
  jobStatusStore.set(jobId, {
    status: "queued",
    createdAt: new Date(),
  });

  // Initialize empty events array for this job
  jobEventsStore.set(jobId, []);

  // Call Trigger.dev
  const triggerResult = await callTriggerDev(
    jobId,
    body.r2Key,
    body.targetLang
  );

  if (triggerResult.error) {
    // Update job status to failed
    jobStatusStore.set(jobId, {
      status: "failed",
      reason: triggerResult.error,
      createdAt: new Date(),
    });

    removeActiveJob(jobId);
    return NextResponse.json({ error: triggerResult.error }, { status: 500 });
  }

  return NextResponse.json({
    runId: jobId,
  });
}

export async function POST(request: NextRequest) {
  try {
    return await processRenderJob(request);
  } catch {
    console.error("Render job API error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check active jobs (for debugging)
export async function GET() {
  const activeJobsArray = getActiveJobsDebug();

  return NextResponse.json({
    activeJobs: activeJobsArray,
    totalActive: activeJobsArray.length,
  });
}
