# #460 Capability verification table

Derived from `matrixCatalog.ts` and the implementation audit. Copy into the PR description.

| Capability | Default (W/P/O) | Configurable | Enforcement | UI | Tests |
| --- | --- | --- | --- | --- | --- |
| `page.create` | Y/Y/N | W,P,O | `requirePageCreate` / wiki create | Wiki → Create pages | policy + coverage |
| `page.edit_owned` | Y/Y/N | W,P,O | `canEditPage` USER ownership | Wiki → Edit own | coverage ownership |
| `page.edit_party` | Y/Y/N | W,P,O | `canEditPage` PARTY ownership | Wiki → Edit party pages | coverage ownership |
| `page.edit_any` | Y/N/N | W,P,O | `canEditPage` / `PAGE_EDIT_ANY` | Wiki → Edit | coverage + visibility |
| `page.visibility.edit` | Y/N/N | W,P,O | `requirePageVisibilityEdit` | Wiki → Manage page access | resourceAccess |
| `wiki.view_party` | Y/Y/Y | W,P,O | `canViewVisibility` | Wiki → View campaign-tier | policy revoke |
| `narrative.elevated_view` | Y/N/N | W,P,O | `hasElevatedNarrativeView` | Wiki → View GM-only | policy + visibility |
| `journal_planner.access` | Y/N/N | W,P,O | `requireJournalPlannerAccess` | Journals → Manage planner | coverage unlock |
| `maps.edit` | Y/N/N | W,P,O | `requireMapsEdit` + map UI `can(MAPS_EDIT)` | Maps → Edit maps | maps hub/viewer |
| `notes.moderate` | Y/N/N | W,P,O | `requireNotesModerate` | Sessions → Manage notes | matrix unlock |
| `downtime.manage` | Y/N/N | W,P,O | `requireDowntimeManage` | Downtime → Manage | matrix unlock |
| `audio.manage` | Y/N/N | W,P,O | sessionRecordings routes | Sessions → Manage recordings | existing audio tests |
| `adventure.storyboard.edit` | Y/N/N | W,P,O | `requireAdventureStoryboardEdit` | Adventure → Manage storyboard | matrix unlock |
| `discovery.reveal` | Y/N/N | W,P,O | `requireDiscoveryReveal` | Discoveries | matrix unlock |
| `rumor.moderate` | Y/N/N | W,P,O | `requireRumorModerate` | Worldbuilding | matrix unlock |
| `assets.delete_any` | Y/N/N | W,P,O | `requireAssetsDeleteAny` | Maps & Assets | matrix unlock |
| `chronology.event.create` | Y/Y/N | W,P,O | `requireChronologyEventCreate` | Chronology → Create events | coverage + ChronologyPage |
| `chronology.event.edit_owned` | Y/Y/N | W,P,O | `canEditChronologyEvent` | Chronology → Edit own events | coverage |
| `chronology.event.edit` | Y/N/N | W,P,O | `canEditChronologyEvent` | Chronology → Edit events | coverage |
| `chronology.event.delete_owned` | Y/Y/N | W,P,O | `canDeleteChronologyEvent` | Chronology → Delete own events | coverage |
| `chronology.era.create` | Y/N/N | W,P,O | `requireChronologyEraCreate` | Chronology → Create eras | coverage |
| `chronology.edit` | Y/legacy flag/N | W,P | `requireChronologyManager` | Chronology → Manage (legacy Player flag) | coverage + legacy flag |

Protected (not configurable): `campaign.delete`, `campaign.transfer_ownership`, `campaign.manage_roles`, `campaign.visibility.edit`, `billing.manage`. GM column remains display-only.
