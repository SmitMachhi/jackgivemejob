// Export all tasks and types from the trigger directory

// Simple video workflow
export { simpleVideoProcess, simpleVideoStatus } from "./simpleVideoWorkflow";
export type { SimpleVideoProcessInput, SimpleVideoProcessOutput } from "./simpleVideoWorkflow";
export { SimpleVideoProcessSchema, SimpleVideoProcessOutputSchema } from "./simpleVideoWorkflow";

// Main render workflow
export { renderWorkflow } from "./renderWorkflow";
export type { RenderWorkflowInput, RenderWorkflowOutput } from "./renderWorkflow";
export { RenderWorkflowSchema, RenderWorkflowOutputSchema } from "./renderWorkflow";

// Utility tasks
export { createRenderJob, checkRenderJobStatus } from "./renderWorkflow";

// Download task
export { downloadTask } from "./downloadTask";
export type { DownloadTaskInput, DownloadTaskOutput } from "./downloadTask";
export { DownloadTaskSchema, DownloadTaskOutputSchema } from "./downloadTask";

// Probe input validation task
export { probeInputTask } from "./probeInput";
export type {
  ProbeInputInput,
  ValidationResult,
  VideoMetadata,
  LanguageDetectionResult
} from "./probeInput";
export {
  ProbeInputSchema,
  ValidationResultSchema,
  VideoMetadataSchema,
  LanguageDetectionResultSchema
} from "./probeInput";
export { ValidationError } from "./probeInput";

// Validation workflow
export { validationWorkflow, validationAndRenderWorkflow } from "./validationWorkflow";
export type {
  ValidationWorkflowInput,
  ValidationWorkflowOutput
} from "./validationWorkflow";
export {
  ValidationWorkflowSchema,
  ValidationWorkflowOutputSchema
} from "./validationWorkflow";

// English transcription tasks
export { transcribeEnTask, quickTranscribeEnTask } from "./transcribeEn";
export type {
  TranscribeEnInput,
  TranscriptionResult,
  WordTimestamp,
  SegmentTimestamp
} from "./transcribeEn";
export {
  TranscribeEnSchema,
  TranscriptionResultSchema,
  WordTimestampSchema,
  SegmentTimestampSchema
} from "./transcribeEn";
export { TranscriptionError } from "./transcribeEn";

// Multi-language caption agent
export { runCaptionAgent, generateMultiLanguageCaptions } from "./captionAgent";
export type {
  CaptionAgentInput,
  CaptionSegment,
  CaptionResult
} from "./captionAgent";
export {
  CaptionAgentSchema,
  CaptionSegmentSchema,
  CaptionResultSchema
} from "./captionAgent";
export { CaptionAgentError } from "./captionAgent";

// Video processing task
export { videoProcessingTask } from "./videoProcessing";
export type {
  VideoProcessingInput,
  VideoProcessingOutput
} from "./videoProcessing";

// Example task
export { helloWorldTask } from "./example";