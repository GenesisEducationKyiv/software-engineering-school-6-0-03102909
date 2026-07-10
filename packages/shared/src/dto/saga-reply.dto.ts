import { z } from 'zod';

export const SagaReplySchema = z.object({
  type: z.enum(['ConfirmationEmailSent', 'ConfirmationEmailFailed']),
  payload: z.object({
    confirmToken: z.string(),
    error: z.string().optional(),
  }),
});

export type SagaReply = z.infer<typeof SagaReplySchema>;

export function createSuccessReply(confirmToken: string): SagaReply {
  return {
    type: 'ConfirmationEmailSent',
    payload: { confirmToken },
  };
}

export function createFailureReply(confirmToken: string, error: string): SagaReply {
  return {
    type: 'ConfirmationEmailFailed',
    payload: { confirmToken, error },
  };
}
