# Localization

Esiana localizes **platform chrome** (menus, buttons, settings labels, notification types)—not campaign canon.

## In scope

- Navigation, settings, empty states, role labels, system category defaults
- Date/number formatting via `Intl` and translated relative-time phrases
- Optional community translations of platform guides (separate markdown files)

## Out of scope

- Wiki page titles and body content
- Multilingual entity title maps or auto-translation of imports
- User-authored sidebar `customLabel` overrides
- Plugin UI copy (plugin authors maintain their own strings)

Users write lore in their native language. The UI translates around that content—a French table titles a page **La Reine Rouge**; Esiana shows French chrome, not a parallel title field.

## `Campaign.language` vs `User.uiLocale`

| Field | Meaning |
|-------|---------|
| `Campaign.language` | Table/recruitment language metadata (e.g. “We play in French”) |
| `User.uiLocale` | BCP 47 tag for interface chrome (`en`, `fr`, …). Null = browser auto-detect |

Do not use campaign language to pick UI locale.

## Architecture

- Locale files: [`frontend/src/i18n/`](../frontend/src/i18n/)
- User preference: `User.uiLocale` on profile API
- Library: i18next + react-i18next
- Fallback: requested language → `en`

See [translating.md](./translating.md) for contributor workflow and file layout.

## Terminology

Product terms (**Campaign Home**, **Game Master**, **Writer**, **Player**) are defined in [experience-doctrine.md](./experience-doctrine.md#user-facing-copy). Translators must preserve these distinctions—never substitute “Dashboard” for Campaign Home in UI copy.

## Coverage

English is complete. Additional shipped locales and resolution order are in [`shared/uiLocale.ts`](../shared/uiLocale.ts). Domain folders under `frontend/src/i18n/` expand incrementally; prefer translating shell and high-traffic campaign surfaces first.

## Instance default locale

Self-hosted instances may set `ESIANA_DEFAULT_LOCALE` (BCP 47, e.g. `fr`) in the backend environment. When a user leaves interface language on **Automatic**, resolution order is:

1. `User.uiLocale` (if set)
2. Instance default (if set and shipped)
3. Browser language (if shipped)
4. English

Shipped locales are listed in [`shared/uiLocale.ts`](../shared/uiLocale.ts). The public system status API exposes `defaultUiLocale` for the frontend bootstrap.

## Deferred translation infrastructure

Hosted translation platforms (Weblate, Crowdin), automated sync workflows, and maintainer completion dashboards are **intentionally deferred** until there are active non-English contributors. The in-repo JSON tree and `pnpm --filter frontend report:i18n` completion summary are sufficient for early community PRs.
