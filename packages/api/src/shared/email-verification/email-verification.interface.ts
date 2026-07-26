import type { EmailVerificationResult } from '@github-release-notification/shared';

export interface IEmailVerificationClient {
  verifyEmail(email: string): Promise<EmailVerificationResult>;
}
