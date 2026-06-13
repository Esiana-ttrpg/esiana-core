export interface ParsedFrontMatter {
  title?: string;
  blurb?: string;
  tags: string[];
  customFields: Record<string, string>;
}

export interface ParsedMarkdownDocument {
  bodyMarkdown: string;
  frontMatter: ParsedFrontMatter;
}

function normalizeTagValues(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap((entry) =>
        typeof entry === 'string' ? entry.split(',') : [String(entry ?? '')],
      )
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (input == null) return [];
  return [String(input).trim()].filter(Boolean);
}

function parseScalar(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function parseFrontMatterBlock(block: string): Record<string, unknown> {
  const lines = block.split(/\r?\n/);
  const result: Record<string, unknown> = {};
  let activeArrayKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && activeArrayKey) {
      const nextValue = trimmed.slice(2).trim();
      const existing = result[activeArrayKey];
      const asArray = Array.isArray(existing) ? existing : [];
      asArray.push(parseScalar(nextValue));
      result[activeArrayKey] = asArray;
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex <= 0) {
      activeArrayKey = null;
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!rawValue) {
      // YAML-like array prelude: "tags:" then "- ..."
      activeArrayKey = key;
      result[key] = [];
      continue;
    }

    activeArrayKey = null;
    result[key] = parseScalar(rawValue);
  }

  return result;
}

export function parseMarkdownFrontMatter(input: string): ParsedMarkdownDocument {
  const normalized = input.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return {
      bodyMarkdown: input.trim(),
      frontMatter: { tags: [], customFields: {} },
    };
  }

  const [, rawFrontMatter, rawBody] = match;
  const parsed = parseFrontMatterBlock(rawFrontMatter);
  const frontMatter: ParsedFrontMatter = {
    tags: [],
    customFields: {},
  };

  for (const [rawKey, rawValue] of Object.entries(parsed)) {
    const key = rawKey.trim();
    const normalizedKey = key.toLowerCase();

    if (normalizedKey === 'title') {
      const title =
        typeof rawValue === 'string'
          ? rawValue.trim()
          : String(rawValue ?? '').trim();
      if (title) frontMatter.title = title;
      continue;
    }

    if (normalizedKey === 'blurb') {
      const blurb =
        typeof rawValue === 'string'
          ? rawValue.trim()
          : String(rawValue ?? '').trim();
      if (blurb) frontMatter.blurb = blurb;
      continue;
    }

    if (normalizedKey === 'tag' || normalizedKey === 'tags') {
      const parsedTags = normalizeTagValues(rawValue);
      if (parsedTags.length > 0) {
        frontMatter.tags = Array.from(new Set([...frontMatter.tags, ...parsedTags]));
      }
      continue;
    }

    const value =
      Array.isArray(rawValue)
        ? rawValue.map((entry) => String(entry ?? '').trim()).filter(Boolean).join(', ')
        : String(rawValue ?? '').trim();
    if (value) {
      frontMatter.customFields[key] = value;
    }
  }

  return {
    bodyMarkdown: rawBody.trim(),
    frontMatter,
  };
}

