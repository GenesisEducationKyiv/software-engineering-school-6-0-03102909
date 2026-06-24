import { z } from 'zod';

export const SagaReplySchema = z.object({
  type: z.enum(['ConfirmationEmailSent', 'ConfirmationEmailFailed']),
  payload: z.object({
    confirmToken: z.string(),
    error: z.string().optional(),
  }),
});

export type SagaReply = z.infer<typeof SagaReplySchema>;
