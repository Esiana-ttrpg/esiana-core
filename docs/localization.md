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

Product terms (**Campaign Home**, **Game Master**, **Writer**, **Player**) are defined in [terminology.md](./terminology.md). Translators must preserve these distinctions—never substitute “Dashboard” for Campaign Home in UI copy.

## Phased rollout

1. **Foundation (Phase 0):** i18n tree, `uiLocale` preference, Account Settings + header slice
2. **Shell (Phase 1):** sidebar, campaign settings chrome, notifications labels, global hub
3. **Workspaces (Phase 2):** incremental domain folders under `campaign/`
4. **Notifications (Phase 3):** structured metadata + localized render at read time

Full UI coverage is incremental; English remains complete throughout.
