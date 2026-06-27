# Esiana Design Philosophy

Engine/product identity and anti-goals: [philosophy.md](./philosophy.md).

Enforcement (density limits, deprecated UI patterns, PR checklist, terminology): [docs/density-doctrine.md](./docs/density-doctrine.md), [docs/deprecated-ui-patterns.md](./docs/deprecated-ui-patterns.md), [docs/design-philosophy-checklist.md](./docs/design-philosophy-checklist.md), [docs/terminology.md](./docs/terminology.md).

**Decision rules (gravity test, 15 principles, action placement):** [docs/experience-doctrine.md](./docs/experience-doctrine.md).

## Experience Identity

Esiana is not a dashboard.
Esiana is not a control console.
Esiana is not productivity software wearing fantasy styling.

Esiana is a narrative operating system.

The interface should feel:

* calm
* literary
* archival
* atmospheric
* emotionally intelligent
* continuity-first
* reflective rather than aggressive

Users should feel like they are navigating a living chronicle, not operating tactical infrastructure.

The platform should support:

* long writing sessions
* deep reading
* continuity tracking
* collaborative storytelling
* narrative discovery
* historical memory

without overwhelming users with operational density.

---

# Core Experience Principles

## 1. Reader-first over operator-first

Narrative comprehension is prioritized over system administration.

The UI should help users:

* understand worlds
* follow continuity
* trace relationships
* discover consequences
* absorb atmosphere

before exposing advanced orchestration controls.

Operational complexity should progressively reveal itself only when necessary.

---

## 2. Calmness is a feature

The interface should reduce cognitive fatigue during long sessions.

Prefer:

* whitespace
* layered hierarchy
* restrained contrast
* progressive disclosure
* gentle transitions
* typography-led structure

Avoid:

* visual overload
* dense widget walls
* excessive simultaneous panels
* aggressive alerts
* constant motion
* high-contrast “gaming UI” aesthetics

The platform should feel sustainable to inhabit for hours.

---

## 3. Typography over borders

Hierarchy should primarily come from:

* spacing
* typography
* rhythm
* grouping
* alignment

not excessive borders or boxed segmentation.

Panels should feel soft and breathable rather than rigidly compartmentalized.

---

## 4. Literary surfaces are first-class

Reading is not a secondary mode.

Editorial reading surfaces should influence the entire platform:

* navigation
* timelines
* chronology
* lore browsing
* relationship exploration
* note systems

The codex should feel like the natural center of the application.

---

## 5. Continuity is visible

History should always feel present.

Users should easily understand:

* what changed
* when it changed
* who changed it
* what consequences emerged
* what information is uncertain
* what perspectives conflict

Narrative memory is a primary interaction layer, not metadata.

---

## 6. Atmosphere without cosplay

Esiana should evoke:

* archives
* manuscripts
* historical atlases
* illuminated texts
* literary research spaces

without becoming:

* fantasy parody
* faux parchment overload
* ornamental clutter
* medieval skeuomorphism

Atmosphere should emerge through restraint and texture, not decoration.

---

# Visual Direction

## Preferred Characteristics

* soft layering
* restrained elevation
* warm neutral surfaces
* subtle gradients
* editorial spacing
* readable line lengths
* elegant typography
* calm iconography
* low-noise metadata
* gentle motion
* ambient depth

## Avoid

* hard black panel stacks
* gamer HUD aesthetics
* tactical control room styling
* enterprise admin density
* excessive card nesting
* overly saturated accent colors
* all-caps UI overload
* aggressive status colors
* productivity-dashboard clutter

---

# Information Density Philosophy

Esiana is a complex system.
Complexity should feel discoverable, not overwhelming.

Prefer:

* progressive disclosure
* contextual expansion
* focus modes
* narrative prioritization
* layered detail surfaces

Avoid:

* exposing every system simultaneously
* dense multi-column dashboards
* persistent admin chrome
* competing focal regions

Users should feel guided, not buried.

---

# Play-first guardrail

Literary tone, calmness, and continuity must **support play** — not formalize it into museum software.

The product must still feel usable at the table, playful, table-friendly, and open to improvisation. Continuity systems are aids to play, not substitutes for it.

**Anti-museum test:** Would a GM reach for this mid-session without breaking flow? If a surface reads like academic narrative infrastructure, simplify.

See [docs/design-philosophy-checklist.md](./docs/design-philosophy-checklist.md).

---

# Language & Terminology

### TTRPG clarity override

Emotionally intelligent TTRPG software — not anti-TTRPG terminology software. Established table vocabulary (**GM**, **DM**, **Game Master**, **Player**, **Writer**) stays in user-facing copy where it aids clarity.

Aspirational terms in this doc (e.g. **Steward**) are tone guides for new product copy — **not** mandatory replacements for GM/DM in UI. Avoid self-consciously literary labels on operational surfaces. Canonical user-facing terms: [docs/terminology.md](./docs/terminology.md).

Language should support:

* stewardship
* continuity
* interpretation
* collaboration
* narrative consequence

Prefer:

* Chronicle
* Threads
* Steward
* Continuity
* Provenance
* Interpretation
* Relationships
* Presence
* World Memory

Avoid excessive use of:

* control
* command
* dominance
* optimization
* simulation jargon
* militaristic terminology

The platform should sound thoughtful rather than operational.

---

# Shell Philosophy

The shell should support reading and immersion, not compete with it.

Navigation should feel:

* ambient
* contextual
* calm
* spatially memorable

The application frame should recede behind narrative content whenever possible.

The codex experience should influence the emotional tone of the entire application.

---

# Motion Philosophy

Motion should communicate:

* continuity
* transitions in understanding
* layered context
* narrative flow

Avoid:

* flashy animation
* gamified effects
* rapid motion
* attention-seeking transitions

Motion exists to support orientation and atmosphere.

---

# Anti-Patterns

Esiana should avoid becoming:

* a GM control console
* a tactical operations dashboard
* a fantasy-themed admin panel
* a widget-heavy productivity app
* a simulation cockpit
* a gamified content management system

Specific anti-patterns include:

* excessive bordered card nesting
* uppercase micro-label overload
* dashboard walls
* icon-only critical actions
* visually dominant metrics
* persistent operational chrome
* unnecessarily noisy sidebars
* “everything visible at once” layouts

---

# Emotional Goal

After several hours in Esiana, users should feel:

* immersed
* thoughtful
* connected to their world
* creatively energized
* oriented within continuity
* emotionally aware of narrative consequences

not:

* administratively exhausted
* operationally burdened
* overstimulated
* buried in systems management

The platform should feel like a living archive of shared storytelling.

# View & Layout Philosophy

Esiana supports multiple interaction modes.
Layouts should adapt to the user’s cognitive context, not merely screen size.

The platform distinguishes between:

* reading and discovery
* writing and orchestration
* overview and immersion

Different views may prioritize different forms of information density and interaction.

---

# Reading Mode

Reading mode prioritizes:

* narrative immersion
* continuity comprehension
* long-form readability
* low cognitive noise
* atmospheric focus

Characteristics:

* restrained chrome
* readable line lengths
* softened metadata
* minimal simultaneous panels
* contextual navigation
* reduced visual interruption

Reading mode should feel closer to an interactive manuscript or archival reader than a dashboard.

---

# Writing Mode

Writing mode prioritizes:

* contextual editing
* relationship management
* continuity awareness
* multi-surface workflows
* orchestration utilities

Characteristics:

* expandable side panels
* metadata visibility
* relationship surfaces
* timeline integration
* provenance tools
* layered editing context

Complexity should remain organized and progressive rather than overwhelming.

---

# Desktop Philosophy

Desktop layouts should support:

* multi-panel workflows
* layered context
* ambient navigation
* continuity visibility
* side-by-side reading and editing

However, desktop should avoid:

* excessive simultaneous density
* dashboard wall layouts
* deeply nested card grids
* persistent visual competition between panels

Wide layouts should increase breathing room before increasing density.

Additional width should primarily improve:

* readability
* panel spacing
* contextual layering
* continuity visibility

not simply expose more controls.

Hard ultrawide rules (measure caps, panel limits, no column proliferation): [docs/density-doctrine.md](./docs/density-doctrine.md#ultrawide-layout-principle).

---

# Mobile Philosophy

Mobile layouts should prioritize:

* focused narrative context
* progressive disclosure
* readable content flow
* lightweight continuity access

Phone layouts should feel immersive and focused, not compressed desktop dashboards.

Tablet layouts may support:

* secondary contextual panes
* split reading/editing views
* continuity side surfaces

but should retain calm visual pacing.

---

# Focus Modes

Certain workflows should support intentional focus states.

Examples:

* immersive reading
* distraction-reduced writing
* chronology exploration
* session recap review

Focus modes should reduce unnecessary chrome and emphasize narrative continuity.

---

# Layout Identity

Layouts should reinforce the platform’s identity as:

* narrative infrastructure
* living archive
* continuity workspace

rather than:

* enterprise administration software
* tactical simulation tooling
* productivity dashboard systems
