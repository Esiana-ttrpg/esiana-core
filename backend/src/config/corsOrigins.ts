/** Explicit browser origins trusted for cross-origin API access. */
export function configuredCorsOrigins(primary: string, additional: string): string[] {
  const values = [primary, ...additional.split(',')].map((value) => value.trim()).filter(Boolean);
  return [...new Set(values.map((value) => {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== value) {
      throw new Error(`Invalid CORS origin: ${value}`);
    }
    return value;
  }))];
}
