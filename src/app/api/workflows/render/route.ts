import { NextRequest, NextResponse } from "next/server";
import { renderWorkflow } from "@/trigger/renderWorkflow";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Trigger the workflow with the payload
    const handle = await renderWorkflow.trigger(body);

    // Return the handle information for tracking
    return NextResponse.json({
      success: true,
      runId: handle.id,
      taskId: "render-workflow",
      message: "Render workflow triggered successfully",
      status: "queued",
    });

  } catch (error) {
    console.error("Error triggering render workflow:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Render workflow endpoint. Use POST to trigger the workflow.",
    supportedMethods: ["POST"],
    schema: {
      type: "object",
      properties: {
        jobId: { type: "string", format: "uuid" },
        templateId: { type: "string" },
        data: { type: "object" },
        format: { type: "string", enum: ["pdf", "html", "image"], default: "pdf" },
        options: { type: "object" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"], default: "normal" },
        webhookUrl: { type: "string", format: "uri" },
        timeout: { type: "number", minimum: 30, maximum: 3600, default: 300 },
        retryAttempts: { type: "number", minimum: 0, maximum: 5, default: 2 },
      },
      required: ["data"],
    },
  });
}