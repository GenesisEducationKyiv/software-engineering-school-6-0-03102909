export interface EmailVerificationResult {
  valid: boolean;
  reason?: string;
  checks: {
    format: boolean;
    mx: boolean;
    disposable: boolean;
  };
}
