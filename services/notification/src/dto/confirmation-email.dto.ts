import { z } from 'zod';

export const ConfirmationEmailSchema = z.object({
  to: z.email(),
  repo: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  confirmToken: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
});

export type ConfirmationEmailDto = z.infer<typeof ConfirmationEmailSchema>;
