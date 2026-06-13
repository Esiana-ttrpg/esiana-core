/**
 * Example data interceptor — prefixes wiki page titles on beforeCreate.
 * Runs in a worker thread; must stay JSON-serializable (no host imports).
 */
export default function wikiPageBeforeCreate(payload, context) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const prefix = '[Example] ';
  const nextTitle =
    title.startsWith(prefix) || title.length === 0 ? title : `${prefix}${title}`;

  return {
    ...payload,
    title: nextTitle,
    campaignId: context.campaignId,
  };
}
