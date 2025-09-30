import { task } from "@trigger.dev/sdk/v3";

import { executeWorkflow, RenderWorkflowInput, WorkflowResult } from "./index";

export const RenderWorkflow = task({
  id: "render-workflow",
  maxDuration: 3600,
  run: async (payload: RenderWorkflowInput) => {
    return await executeWorkflow(payload);
  },
});

export type { RenderWorkflowInput, WorkflowResult };
