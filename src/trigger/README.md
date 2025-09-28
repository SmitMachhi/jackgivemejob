# Trigger.dev Render Workflows

This directory contains Trigger.dev task definitions for handling render jobs in the application.

## Available Tasks

### 1. `renderWorkflow` (`render-workflow`)
The main workflow that handles the complete lifecycle of render jobs.

**Features:**
- Job creation and monitoring
- Real-time status polling
- Webhook notifications on completion
- Comprehensive error handling and retries
- Event logging and tracking

**Input Schema:**
```typescript
{
  jobId?: string;           // Optional: UUID of existing job to monitor
  templateId?: string;       // Optional: Render template identifier
  data: Record<string, any>; // Required: Render data payload
  format?: "pdf" | "html" | "image"; // Optional: Output format (default: pdf)
  options?: Record<string, any>; // Optional: Additional render options
  priority?: "low" | "normal" | "high" | "urgent"; // Optional: Job priority
  webhookUrl?: string;      // Optional: Webhook URL for notifications
  timeout?: number;         // Optional: Workflow timeout in seconds (default: 300)
  retryAttempts?: number;   // Optional: Number of retry attempts (default: 2)
}
```

**Output Schema:**
```typescript
{
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  input: any;
  output?: any;
  error?: string;
  duration: number;
  events: any[];
  webhookDelivered?: boolean;
  webhookResponse?: any;
}
```

### 2. `createRenderJob` (`create-render-job`)
Utility task for creating new render jobs.

**Input Schema:**
```typescript
{
  templateId?: string;
  data: Record<string, any>;
  format?: "pdf" | "html" | "image";
}
```

### 3. `checkRenderJobStatus` (`check-render-job-status`)
Utility task for checking the status of existing render jobs.

**Input Schema:**
```typescript
{
  jobId: string;
}
```

## Triggering Tasks

### Using the API Endpoint

Trigger the main workflow via the HTTP endpoint:

```bash
curl -X POST http://localhost:3000/api/workflows/render \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "invoice-template",
    "data": {"customer": "John Doe", "amount": 100},
    "format": "pdf",
    "webhookUrl": "https://your-app.com/webhooks/render-complete"
  }'
```

### From Your Code

```typescript
import { renderWorkflow } from "@/trigger/renderWorkflow";

// Trigger the workflow
const handle = await renderWorkflow.trigger({
  templateId: "invoice-template",
  data: { customer: "John Doe", amount: 100 },
  format: "pdf",
});

console.log("Workflow triggered with ID:", handle.id);
```

### Using the Dashboard

1. Navigate to your Trigger.dev dashboard
2. Select the task you want to run
3. Use the "Test" feature to trigger the task with custom payload

## Monitoring and Logging

All tasks include comprehensive logging:
- Job creation and status updates
- Error tracking with detailed context
- Webhook delivery status
- Performance metrics (duration, attempts)

## Development

### Adding New Tasks

1. Create a new task function in this directory
2. Follow the established patterns for input validation and error handling
3. Export the task for external use
4. Test using the Trigger.dev dashboard

### Best Practices

- Use Zod schemas for input validation
- Include comprehensive logging with context
- Handle errors gracefully with meaningful messages
- Use `wait.for()` instead of manual setTimeout for delays
- Follow the established naming conventions

## Configuration

The workflow configuration is managed in `trigger.config.ts`:

- **Timeout**: 3600 seconds (1 hour) maximum
- **Retries**: 3 attempts with exponential backoff
- **Logging**: Full logging enabled in development

## Integration with Render Service

These tasks integrate seamlessly with the `renderService` from `@/lib/services/render-service`:

- Event tracking and storage
- Job lifecycle management
- Progress monitoring
- Error handling and recovery

For more information about Trigger.dev, visit the [official documentation](https://trigger.dev/docs/).