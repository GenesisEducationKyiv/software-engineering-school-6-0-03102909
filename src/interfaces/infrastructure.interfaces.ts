export interface IGithubClient {
  validateRepository(owner: string, name: string): Promise<{ owner: string; name: string }>;
  getLatestRelease(owner: string, name: string): Promise<string>;
}

export interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}

export interface IConfirmationEmailQueue {
  enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void>;
}
