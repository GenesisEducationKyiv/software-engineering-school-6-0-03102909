export class WrappedError extends Error {
  public readonly originalValue: unknown;

  constructor(value: unknown) {
    super(String(value));
    this.name = 'WrappedError';
    this.originalValue = value;
  }
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new WrappedError(err);
}
