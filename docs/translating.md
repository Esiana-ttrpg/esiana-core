# Translating Esiana

Community PRs welcome. Partial locales are fine—ship what you can; English fills gaps.

## Where files live

```
frontend/src/i18n/
  en/                          # canonical (required complete for shipped features)
    common.json
    home.json
    navigation/
      main.json
      sidebar.json
    campaign/
      core.json
      dashboard.json
      ...
    profile/
      profile.json
      preferences.json
    auth/
    admin/
  fr/                          # mirror en/ tree (partial OK)
    common.json
    navigation/
      sidebar.json
```

**Primary layer:** domain folders (`campaign/`, `profile/`, `admin/`).  
**Not:** one JSON file per screen, or giant mixed `settings.json` god files.

## Key naming

Flat keys inside each JSON file. Prefix **must match the file path**:

| File | Key prefix | Example |
|------|------------|---------|
| `common.json` | `common` | `common.save` |
| `navigation/sidebar.json` | `navigation.sidebar` | `navigation.sidebar.campaignHome` |
| `campaign/dashboard.json` | `campaign.dashboard` | `campaign.dashboard.recentActivity` |
| `profile/preferences.json` | `profile.preferences` | `profile.preferences.uiLocaleLabel` |

Pattern: `{domainPath}.{camelCaseDescriptor}`

- camelCase after the final dot
- no nested JSON objects
- shared buttons/errors → `common.*` only (do not duplicate into domain files)

Code uses the same string: `t('navigation.sidebar.campaignHome')`.

## CI validation

```bash
pnpm --filter frontend validate:i18n
```

Fails when:

- keys do not match `{domainPath}.{camelCase}`
- key prefix does not match file path
- duplicate keys across files
- non-string values (nested objects)

## PR checklist

1. Feature PRs add `en` keys in the matching domain file.
2. Translation PRs mirror the `en/` folder structure under `fr/` (or other locale).
3. Link terminology-sensitive keys to [terminology.md](./terminology.md).
4. Do not translate user-authored campaign content in examples or screenshots.

## Adding a new domain file

1. Create `en/{domain}/{topic}.json`
2. Document the folder in this file (or a PR comment)
3. Use keys prefixed with `{domain}.{topic}.`

## Anti-patterns

| Avoid | Prefer |
|-------|--------|
| `campaign.home` | `navigation.sidebar.campaignHome` |
| `save.success` | `common.saveSuccess` |
| `characters.title` | `campaign.characters.indexTitle` |
| Per-screen files (`map_view.json`) | Domain subtopic files (`campaign/maps.json`) |
| Duplicating `common.save` in domain files | Import via `t('common.save')` |

## Locale availability

Shipped UI bundles are listed in [`shared/uiLocale.ts`](../shared/uiLocale.ts) (`SHIPPED_UI_LOCALES`). Community locales merge on top of English for missing keys.

Ready for maintainer review after CI passes.
