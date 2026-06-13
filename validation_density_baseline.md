# World advance validation — Calendar Test

Campaign: `calendar-test` · Mode: apply

## war_escalation

| Field | Value |
|-------|-------|
| Headline | Stormsbreath 4672 |
| Conditions | Locations: region_stability=unstable, Locations: military_pressure=rising |
| Effects | 3 |
| Chronology event | e780965c-9bcc-43c7-8fe3-099fee2c7a0e |
| Validation | FAIL |

### war_escalation — anti-goals
- [x] No synthesis "trade disruption"
- [x] No synthesis "harvest"

### war_escalation — locality
- [x] All checks passed


## refugee_crisis

| Field | Value |
|-------|-------|
| Headline | Stormsbreath 4672 |
| Conditions | World: region_stability=strained, World: migration_pressure=severe |
| Effects | 3 |
| Chronology event | 51174cdc-6ab9-409a-8a0e-089ca3cabb54 |
| Validation | PASS |

### refugee_crisis — anti-goals
- [x] No military_pressure: critical
- [x] No synthesis "ally toward"

### refugee_crisis — locality
- [x] All checks passed


## failed_harvest

| Field | Value |
|-------|-------|
| Headline | Stormsbreath 4672 |
| Conditions | Game: prosperity=declining, Game: migration_pressure=moderate |
| Effects | 3 |
| Chronology event | ff6a3b24-4160-49ef-81df-7f4c7a4ed6a8 |
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
| Headline | Stormsbreath 4672 |
| Conditions | (none) |
| Effects | 2 |
| Chronology event | c75f2841-5b43-473e-abb3-8b7a57a6c9e3 |
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
| Headline | Stormsbreath 4672 |
| Conditions | Maps: prosperity=declining |
| Effects | 2 |
| Chronology event | 42d3cd2b-2507-4e34-a12f-f0a0f2936294 |
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
| Headline | Stormsbreath 4672 |
| Conditions | Organizations: region_stability=strained, Organizations: prosperity=declining, Organizations: migration_pressure=severe |
| Effects | 3 |
| Chronology event | 2524ca1a-55bc-486a-92c8-e2affcb133d4 |
| Validation | FAIL |

### harsh_winter — anti-goals
- [x] No region_stability: unstable
- [x] No synthesis "escalat"
- [x] No synthesis "HOSTILE"

### harsh_winter — locality
- [x] All checks passed

