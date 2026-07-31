export interface FrontMatterInput {
  title?: string;
  blurb?: string;
  tags?: string[];
  customFields?: Record<string, string | number | boolean | null | undefined>;
}

function escapeYamlScalar(value: string): string {
  if (/[:#\[\]{}&*!|>'"%@`,]/.test(value) || value.includes('\n') || /^\s|\s$/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

function formatYamlValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return escapeYamlScalar(value);
}

export function serializeFrontMatter(input: FrontMatterInput): string {
  const lines: string[] = [];

  if (input.title?.trim()) {
    lines.push(`title: ${formatYamlValue(input.title.trim())}`);
  }

  if (input.blurb?.trim()) {
    lines.push(`blurb: ${formatYamlValue(input.blurb.trim())}`);
  }

  const tags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (tags.length === 1) {
    lines.push(`tags: ${formatYamlValue(tags[0])}`);
  } else if (tags.length > 1) {
    lines.push('tags:');
    for (const tag of tags) {
      lines.push(`  - ${formatYamlValue(tag)}`);
    }
  }

  for (const [key, rawValue] of Object.entries(input.customFields ?? {})) {
    if (rawValue == null || rawValue === '') continue;
    lines.push(`${key}: ${formatYamlValue(String(rawValue))}`);
  }

  if (lines.length === 0) return '';
  return `---\n${lines.join('\n')}\n---`;
}

export function composeMarkdownDocument(
  frontMatter: FrontMatterInput,
  bodyMarkdown: string,
): string {
  const header = serializeFrontMatter(frontMatter);
  const body = bodyMarkdown.trim();
  if (!header) return body;
  if (!body) return header;
  return `${header}\n\n${body}`;
}
