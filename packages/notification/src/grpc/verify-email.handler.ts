import * as grpc from '@grpc/grpc-js';
import type { Logger } from '@github-release-notification/shared';
import type { EmailVerificationService } from '../services/email-verification.service.js';
import type { EmailVerificationServiceServer } from '@github-release-notification/shared';

export function createEmailVerificationGrpcHandlers(
  emailService: EmailVerificationService,
  log: Logger,
): EmailVerificationServiceServer {
  return {
    verifyEmail: async (call, callback) => {
      try {
        const { email } = call.request;

        if (!email || typeof email !== 'string') {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Missing or invalid "email" field',
          });
          return;
        }

        const result = await emailService.verifyEmail(email);

        callback(null, {
          valid: result.valid,
          reason: result.reason,
          checks: {
            format: result.checks.format,
            mx: result.checks.mx,
            disposable: result.checks.disposable,
          },
        });
      } catch (err) {
        log.error({ err }, 'Error in gRPC verifyEmail handler');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error during email verification',
        });
      }
    },
  };
}
