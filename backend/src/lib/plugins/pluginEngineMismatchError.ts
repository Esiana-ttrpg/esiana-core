export class PluginEngineMismatchError extends Error {
  readonly status = 409;
  readonly code = 'ENGINE_MISMATCH';

  constructor(message: string) {
    super(message);
    this.name = 'PluginEngineMismatchError';
  }
}

export function isPluginEngineMismatchError(
  error: unknown,
): error is PluginEngineMismatchError {
  return error instanceof PluginEngineMismatchError;
}
