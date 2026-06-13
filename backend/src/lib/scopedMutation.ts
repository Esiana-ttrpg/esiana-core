export class ScopedMutationNotFoundError extends Error {
  constructor(message = 'Record not found') {
    super(message);
    this.name = 'ScopedMutationNotFoundError';
  }
}

export function assertScopedMutationCount(
  count: number,
  expected = 1,
  message = 'Record not found',
): void {
  if (count !== expected) {
    throw new ScopedMutationNotFoundError(message);
  }
}
