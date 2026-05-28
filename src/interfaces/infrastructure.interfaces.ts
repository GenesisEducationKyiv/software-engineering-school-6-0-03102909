export interface IGithubClient {
  validateRepository(owner: string, name: string): Promise<{ owner: string; name: string }>;
  getLatestRelease(owner: string, name: string): Promise<string>;
}

export interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}

export interface ReleaseNotificationDto {
  to: string;
  repo: string;
  tag: string;
  unsubscribeToken: string;
}

export interface IConfirmationEmailQueue {
  enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void>;
}

export interface IReleaseNotificationQueue {
  enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void>;
}
