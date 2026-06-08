export interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}

export interface IConfirmationEmailQueue {
  enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void>;
}

export interface INotificationService {
  sendConfirmationEmail(to: string, repo: string, confirmToken: string): Promise<void>;
  sendReleaseNotification(to: string, repo: string, tag: string, unsubscribeToken: string): Promise<void>;
}
