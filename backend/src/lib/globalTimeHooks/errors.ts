import type { GlobalTimeHookId, GlobalTimeHookResult } from '../../../../shared/globalTimeHooks.js';

export class GlobalTimeHookExecutionError extends Error {
  readonly hookId: GlobalTimeHookId;
  readonly handlerVersion: string;
  readonly partialResults: GlobalTimeHookResult[];

  constructor(input: {
    hookId: GlobalTimeHookId;
    handlerVersion: string;
    message: string;
    partialResults: GlobalTimeHookResult[];
  }) {
    super(input.message);
    this.name = 'GlobalTimeHookExecutionError';
    this.hookId = input.hookId;
    this.handlerVersion = input.handlerVersion;
    this.partialResults = input.partialResults;
  }
}
