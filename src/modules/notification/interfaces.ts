export interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}

export interface IConfirmationEmailQueue {
  enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void>;
}
