# World advance validation — Calendar Test

Campaign: `calendar-test` · Mode: apply

## war_escalation

| Field | Value |
|-------|-------|
| Headline | Ironclad 4672 |
| Conditions | Locations: region_stability=unstable, Locations: military_pressure=rising |
| Effects | 3 |
| Chronology event | 6db47351-8e7b-403e-bafb-f2201ce9d49d |
| Validation | FAIL |

### war_escalation — anti-goals
- [x] No synthesis "trade disruption"
- [x] No synthesis "harvest"

### war_escalation — locality
- [x] All checks passed


## refugee_crisis

| Field | Value |
|-------|-------|
| Headline | Ironclad 4672 |
| Conditions | World: region_stability=strained, World: migration_pressure=severe |
| Effects | 3 |
| Chronology event | 40193d34-38cc-4e1a-8ad4-fe154ff7b40a |
| Validation | PASS |

### refugee_crisis — anti-goals
- [x] No military_pressure: critical
- [x] No synthesis "ally toward"

### refugee_crisis — locality
- [x] All checks passed


## failed_harvest

| Field | Value |
|-------|-------|
| Headline | Drakesfire 4672 |
| Conditions | Game: prosperity=declining, Game: migration_pressure=moderate |
| Effects | 3 |
| Chronology event | 698ddb55-9ebd-4512-8bea-7dd6cbf8296d |
| Validation | FAIL |

### failed_harvest — anti-goals
- [x] No military_pressure: critical
- [x] No synthesis "war"
- [x] No synthesis "escalat"
- [x] No synthesis "displacement"

### failed_harvest — locality
- [x] All checks passed


## noble_alliance

| Field | Value |
|-------|-------|
| Headline | Drakesfire 4672 |
| Conditions | (none) |
| Effects | 2 |
| Chronology event | fea7a3ee-9b15-45de-892a-1fe07e42bd58 |
| Validation | FAIL |

### noble_alliance — anti-goals
- [x] No migration_pressure: severe
- [x] No synthesis "escalat"
- [x] No synthesis "critical"
- [x] No synthesis "displacement"

### noble_alliance — locality
- [x] All checks passed


## trade_collapse

| Field | Value |
|-------|-------|
| Headline | Bloomreach 4672 |
| Conditions | Maps: prosperity=declining |
| Effects | 2 |
| Chronology event | 9660f7d6-e345-4075-80ee-31a8cdc562f7 |
| Validation | FAIL |

### trade_collapse — anti-goals
- [x] No military_pressure: critical / rising
- [x] No region_stability: unstable
- [x] No synthesis "escalat"
- [x] No synthesis "HOSTILE"

### trade_collapse — locality
- [ ] FAIL [locality] out_of_scope_surface: Region surface on Maps (prosperity)

## harsh_winter

| Field | Value |
|-------|-------|
| Headline | Bloomreach 4672 |
| Conditions | Organizations: region_stability=strained, Organizations: prosperity=declining, Organizations: migration_pressure=severe |
| Effects | 3 |
| Chronology event | 8664e407-dea5-41c6-9830-38c3998b017a |
| Validation | FAIL |

### harsh_winter — anti-goals
- [x] No region_stability: unstable
- [x] No synthesis "escalat"
- [x] No synthesis "HOSTILE"

### harsh_winter — locality
- [x] All checks passed


## Chronology density

- `totalCollected`: 256
- `world_advance` entries: 256
- `truncation.capped`: false
- `CONVERGENCE_MAX_ENTRIES`: 2000

> Overlay cap not hit (`truncation.capped: false`). Feed **batch grouping** was still implemented after the GM readability rubric failed (see [world-advance-validation.md](docs/architecture-internal/world-advance-validation.md#density-validation-results-2026-06-04)).
