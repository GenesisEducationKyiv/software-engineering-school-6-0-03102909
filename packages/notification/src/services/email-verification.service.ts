import dns from 'node:dns/promises';
import disposableDomains from 'disposable-email-domains/index.json' with { type: 'json' };
import { z } from 'zod';
import type { Logger } from '../config/logger.js';

import type { EmailVerificationResult } from '@github-release-notification/shared';

const emailSchema = z.email();
const disposableSet = new Set<string>(disposableDomains);

export class EmailVerificationService {
  private readonly log: Logger;

  constructor(logger: Logger) {
    this.log = logger.child({ service: 'EmailVerificationService' });
  }

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const checks = { format: false, mx: false, disposable: false };

    if (!this.isValidFormat(email)) {
      this.log.debug({ email }, 'email failed format check');
      return { valid: false, reason: 'Invalid email format', checks };
    }
    checks.format = true;

    const domain = email.split('@')[1]!.toLowerCase();

    if (this.isDisposable(domain)) {
      this.log.debug({ email, domain }, 'disposable email domain detected');
      checks.disposable = true;
      return { valid: false, reason: `Disposable email domain: ${domain}`, checks };
    }

    if (!(await this.hasMxRecords(domain))) {
      this.log.debug({ email, domain }, 'MX lookup failed');
      return { valid: false, reason: `No MX records for domain: ${domain}`, checks };
    }
    checks.mx = true;

    this.log.info({ email }, 'email verification passed');
    return { valid: true, checks };
  }

  private isValidFormat(email: string): boolean {
    return emailSchema.safeParse(email).success;
  }

  private isDisposable(domain: string): boolean {
    return disposableSet.has(domain);
  }

  private async hasMxRecords(domain: string): Promise<boolean> {
    try {
      await dns.resolveMx(domain);
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOTFOUND' || code === 'ENODATA') {
        return false;
      }
      throw err;
    }
  }
}
