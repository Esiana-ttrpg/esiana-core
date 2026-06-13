export interface WikiDecoratorContext {
  pluginId: string;
  campaignId: string;
  role: string | null;
}

export type WikiContentDecoratorFn = (
  page: Record<string, unknown>,
  context: WikiDecoratorContext,
) => Record<string, unknown> | void;

interface RegisteredWikiDecorator {
  pluginId: string;
  fn: WikiContentDecoratorFn;
}

const decorators: RegisteredWikiDecorator[] = [];

export function registerWikiContentDecorator(
  pluginId: string,
  fn: WikiContentDecoratorFn,
): void {
  decorators.push({ pluginId, fn });
}

export function clearWikiContentDecorators(): void {
  decorators.length = 0;
}

/** Merge decorator output — metadata and pluginDisplay only; blocks/title/visibility unchanged. */
function mergeDecoratedPage(
  original: Record<string, unknown>,
  decorated: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...original };

  if (decorated.metadata && typeof decorated.metadata === 'object' && !Array.isArray(decorated.metadata)) {
    const base =
      original.metadata && typeof original.metadata === 'object' && !Array.isArray(original.metadata)
        ? (original.metadata as Record<string, unknown>)
        : {};
    result.metadata = {
      ...base,
      ...(decorated.metadata as Record<string, unknown>),
    };
  }

  if (
    decorated.pluginDisplay &&
    typeof decorated.pluginDisplay === 'object' &&
    !Array.isArray(decorated.pluginDisplay)
  ) {
    result.pluginDisplay = decorated.pluginDisplay;
  }

  return result;
}

export function applyWikiContentDecorators(
  page: Record<string, unknown>,
  context: Omit<WikiDecoratorContext, 'pluginId'>,
): Record<string, unknown> {
  if (decorators.length === 0) {
    return page;
  }

  let current = { ...page };

  for (const { pluginId, fn } of decorators) {
    try {
      const input =
        process.env.NODE_ENV === 'development'
          ? (Object.freeze(structuredClone(current)) as Record<string, unknown>)
          : structuredClone(current);
      const output = fn(input, { ...context, pluginId });
      if (output && typeof output === 'object' && !Array.isArray(output)) {
        current = mergeDecoratedPage(current, output as Record<string, unknown>);
      }
    } catch (err) {
      console.error(`[plugins] Wiki decorator "${pluginId}" failed:`, err);
    }
  }

  return current;
}
