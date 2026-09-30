import {
  COMMAND_GROUP_ORDER,
  type Command,
  type CommandContext,
  type CommandProvider,
} from './types.js';

const providers = new Map<string, CommandProvider>();

/** Idempotent by provider id (last registration wins). */
export function registerCommandProvider(provider: CommandProvider): void {
  providers.set(provider.id, provider);
}

export function listCommandProviders(): CommandProvider[] {
  return [...providers.values()];
}

/** Test helper — clears all registered providers. */
export function clearCommandProviders(): void {
  providers.clear();
}

function passesRequires(command: Command, ctx: CommandContext): boolean {
  if (!command.requires || command.requires.length === 0) return true;
  return command.requires.every((cap) => ctx.can(cap));
}

/**
 * Runs providers, drops commands whose `requires` fail, dedupes by id
 * (first wins), sorts by COMMAND_GROUP_ORDER then registration order.
 */
export function resolveCommands(ctx: CommandContext): Command[] {
  const seen = new Set<string>();
  const collected: Command[] = [];

  for (const provider of providers.values()) {
    for (const command of provider.commands(ctx)) {
      if (seen.has(command.id)) continue;
      if (!passesRequires(command, ctx)) continue;
      seen.add(command.id);
      collected.push(command);
    }
  }

  const groupRank = new Map(
    COMMAND_GROUP_ORDER.map((group, index) => [group, index]),
  );

  return collected.sort((a, b) => {
    const ga = groupRank.get(a.group) ?? COMMAND_GROUP_ORDER.length;
    const gb = groupRank.get(b.group) ?? COMMAND_GROUP_ORDER.length;
    if (ga !== gb) return ga - gb;
    return 0;
  });
}
