import * as grpc from '@grpc/grpc-js';
import type { Logger } from '@github-release-notification/shared';
import type { EmailVerificationService } from '../services/email-verification.service.js';
import {
  EmailVerificationServiceService,
  type EmailVerificationServiceServer,
} from '@github-release-notification/shared';

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
            message: 'Missing or invalid "email" field',
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
          message: 'Internal server error during email verification',
        });
      }
    },
  };
}

export function startGrpcServer(
  host: string,
  port: number,
  emailService: EmailVerificationService,
  logger: Logger,
): Promise<grpc.Server> {
  return new Promise((resolve, reject) => {
    const server = new grpc.Server();

    server.addService(
      EmailVerificationServiceService,
      createEmailVerificationGrpcHandlers(emailService, logger),
    );

    server.bindAsync(
      `${host}:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          logger.error({ err }, 'Failed to bind gRPC server');
          reject(err);
          return;
        }

        logger.info({ port: boundPort }, 'gRPC server started');
        resolve(server);
      },
    );
  });
}
