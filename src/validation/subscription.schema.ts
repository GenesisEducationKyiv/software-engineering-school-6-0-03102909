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

export const getSubscriptionsSchema = z.object({
  query: z.object({
    email: z.email({ error: 'Invalid email format' }),
  }),
});

export const tokenParamSchema = z.object({
  params: z.object({
    token: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid token'),
  }),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>['body'];
