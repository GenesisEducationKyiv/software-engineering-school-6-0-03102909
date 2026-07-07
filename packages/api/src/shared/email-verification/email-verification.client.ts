import { HttpError } from '../errors/HttpError.js';
import type { EmailVerificationResult } from '@github-release-notification/shared';

import type { IEmailVerificationClient } from './email-verification.interface.js';

export class EmailVerificationClient implements IEmailVerificationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const defaultChecks = { format: false, mx: false, disposable: false };

    try {
      const response = await fetch(`${this.baseUrl}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new HttpError('Invalid argument', 400);
          case 404:
            throw new HttpError('Resource not found', 404);
          case 503:
          case 504:
            throw new HttpError('Verification service unavailable', 500);
          default:
            throw new HttpError('Internal server error communicating with verification service', response.status);
        }
      }

      const data = await response.json() as EmailVerificationResult;

      const result: EmailVerificationResult = {
        valid: Boolean(data.valid),
        checks: data.checks ?? defaultChecks,
      };

      if (data.reason) {
        result.reason = data.reason;
      }

      return result;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError('Could not connect to verification service', 503);
    }
  }
}
