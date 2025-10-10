import { z } from 'zod'

export const askAssistantSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  mode: z.enum(['text', 'voice']),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  userName: z.string().optional(),
  options: z
    .object({
      streaming: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
})
