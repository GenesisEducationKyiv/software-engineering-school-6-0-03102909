import { z } from 'zod';

export const ReleaseNotificationSchema = z.object({
  to: z.email(),
  repo: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  tag: z.string(),
  unsubscribeToken: z
    .string()
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
});

export type ReleaseNotificationDto = z.infer<typeof ReleaseNotificationSchema>;
