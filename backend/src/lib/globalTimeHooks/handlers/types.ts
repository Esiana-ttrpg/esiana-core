import type { Prisma } from '@prisma/client';
import type {
  GlobalTimeAdvanceContext,
  GlobalTimeHookCounts,
  GlobalTimeHookId,
  GlobalTimeHookStatus,
} from '../../../../../shared/globalTimeHooks.js';

export type GlobalTimeHookHandlerResult = {
  handlerVersion: string;
  status: GlobalTimeHookStatus;
  summary?: string;
  counts?: GlobalTimeHookCounts;
  error?: string;
};

export type GlobalTimeHookHandler = (
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
) => Promise<GlobalTimeHookHandlerResult>;

export type RegisteredGlobalTimeHook = {
  hookId: GlobalTimeHookId;
  handlerVersion: string;
  run: GlobalTimeHookHandler;
};
