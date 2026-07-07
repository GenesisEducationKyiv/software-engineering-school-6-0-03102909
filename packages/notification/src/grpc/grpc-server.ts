import * as grpc from '@grpc/grpc-js';
import type { Logger } from '@github-release-notification/shared';
import type { EmailVerificationService } from '../services/email-verification.service.js';
import { EmailVerificationServiceService } from '@github-release-notification/shared';
import { createEmailVerificationGrpcHandlers } from './verify-email.handler.js';

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
