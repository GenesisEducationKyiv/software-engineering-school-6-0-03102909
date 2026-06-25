import type { EmailVerificationResult } from '@github-release-notification/shared';

export interface IEmailVerificationClient {
  verifyEmail(email: string): Promise<EmailVerificationResult>;
}

export class EmailVerificationClient implements IEmailVerificationClient {
  constructor(private readonly baseUrl: string) {}

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const defaultChecks = { format: false, mx: false, disposable: false };

    try {
      const response = await fetch(`${this.baseUrl}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { 
          valid: false, 
          reason: 'Verification service unavailable', 
          checks: defaultChecks 
        };
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
    } catch (_err) {
      return { 
        valid: false, 
        reason: 'Could not connect to verification service',
        checks: defaultChecks,
      };
    }
  }
}
