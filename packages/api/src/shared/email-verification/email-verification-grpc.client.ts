import * as grpc from '@grpc/grpc-js';
import { HttpError } from '../errors/HttpError.js';
import type { IEmailVerificationClient } from './email-verification.interface.js';
import type { EmailVerificationResult } from '@github-release-notification/shared';
import { EmailVerificationServiceClient } from '@github-release-notification/shared';

export class GrpcEmailVerificationClient implements IEmailVerificationClient {
  private client: EmailVerificationServiceClient;

  constructor(target: string, private readonly timeoutMs: number) {
    this.client = new EmailVerificationServiceClient(
      target,
      grpc.credentials.createInsecure()
    );
  }

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const defaultChecks = { format: false, mx: false, disposable: false };

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + this.timeoutMs;

      const metadata = new grpc.Metadata();

      this.client.verifyEmail(
        { email },
        metadata,
        { deadline },
        (err, response) => {
          if (err) {
            switch (err.code) {
              case grpc.status.INVALID_ARGUMENT:
                reject(new HttpError(err.details || 'Invalid argument', 400));
                break;
              case grpc.status.NOT_FOUND:
                reject(new HttpError(err.details || 'Resource not found', 404));
                break;
              case grpc.status.DEADLINE_EXCEEDED:
                reject(new HttpError('Verification service timed out', 500));
                break;
              case grpc.status.UNAVAILABLE:
                reject(new HttpError('Verification service unavailable', 500));
                break;
              default:
                reject(new HttpError('Internal server error communicating with verification service', 500));
            }
            return;
          }

          const result: EmailVerificationResult = {
            valid: response.valid,
            checks: response.checks ?? defaultChecks,
          };

          if (response.reason) {
            result.reason = response.reason;
          }

          resolve(result);
        }
      );
    });
  }
}
