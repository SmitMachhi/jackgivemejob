import { z } from 'zod';

export const RenderJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.date(),
  updatedAt: z.date(),
  input: z.object({
    templateId: z.string().optional(),
    data: z.record(z.any()),
    format: z.enum(['pdf', 'html', 'image']).optional().default('pdf'),
    options: z.record(z.any()).optional().default({})
  }),
  output: z.object({
    url: z.string().url().optional(),
    fileUrl: z.string().url().optional(),
    metadata: z.record(z.any()).optional()
  }).optional(),
  error: z.string().optional()
});

export type RenderJobType = z.infer<typeof RenderJobSchema>;

export const CreateRenderJobSchema = z.object({
  templateId: z.string().optional(),
  data: z.record(z.any()),
  format: z.enum(['pdf', 'html', 'image']).optional().default('pdf'),
  options: z.record(z.any()).optional().default({})
});

export type CreateRenderJobType = z.infer<typeof CreateRenderJobSchema>;

export const UpdateRenderJobSchema = RenderJobSchema.partial().omit({
  id: true,
  createdAt: true
});

export type UpdateRenderJobType = z.infer<typeof UpdateRenderJobSchema>;