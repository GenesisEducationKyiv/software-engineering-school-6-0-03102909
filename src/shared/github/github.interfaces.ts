export interface IGithubClient {
  validateRepository(owner: string, name: string): Promise<{ owner: string; name: string }>;
  getLatestRelease(owner: string, name: string): Promise<string>;
}
