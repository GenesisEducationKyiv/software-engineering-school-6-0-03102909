export interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}
