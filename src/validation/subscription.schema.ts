import { z } from 'zod';

export const subscribeSchema = z.object({
  body: z.object({
    email: z.email({ error: 'Invalid email format' }),

    repo: z
      .string()
      .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, {
        error: 'Repository must be in "owner/repo" format',
      }),
  }),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>['body'];
