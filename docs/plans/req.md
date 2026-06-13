Based on your vision, we can distill this into three core functional requirements. This framework ensures your platform doesn't become a gimmick; it preserves the absolute authority of the wiki text while layer-cakeing deep chronological data on top of it.

Here is the architectural requirements blueprint for this integrated system.

---

## 🛠️ The Core Requirements Blueprint

### 1. The Single Source of Truth: Wiki Articles as Primary Data

The core principle of any wiki is that text is king. Visualizations must never exist as independent data silos; they are simply projections of the text and metadata.

* **The Text Authority:** A Faction or Dynasty page is first and foremost a TipTap markdown document. It holds historical logs, secrets, and raw lore written by the DM.
* **Metadata Harvesting:** Relational data (e.g., `Leader: CharacterID`, `AlliedWith: [FactionID]`, `FoundedYear: 402`) lives in a structured sidebar panel *attached* to that wiki page. The system scrapes this metadata to draw the maps, trees, and charts. If you delete the wiki page, it gracefully cleans up its nodes on the graphs automatically.

### 2. Deep Relational Mechanics (The Verbs)

The database must be able to track complex, interconnected relationships that shift over time, supporting asymmetrical world states.

* **Asymmetric Faction Relations:** The database must support directional stances. The *Thieves' Guild* might secretly target *House Sterling*, while *House Sterling* views them as a minor public nuisance. Relations require historical timestamps (e.g., *Stance shifted to Hostile on Winter 402*).
* **Chronological Lineage Rows:** Instead of a generic flowchart, lineage mapping requires a strict generational horizontal axis tied directly to your in-game calendar system, tracking birth, death, succession shifts, and branch splitting across eras.

### 3. The "World" Nexus: The Macro Temporal-Combined View

The top-level **World** landing page functions as an automated intelligence dashboard. It combines your pure structural wiki data with your running campaign clock.

* **The Chrono-Scrubber (Time Integration):** The dashboard features a master timeline slider hooked straight into your existing **Calendars & Timelines** mechanics.
* **Dynamic State Projection:** Dragging the slider back and forth through history updates the Geopolitical Diplomacy Web and the Dynasty Hub layout in real time.
* **Cause & Effect Visibility:** Clicking an event on your timeline highlights the corresponding visual changes on the diplomacy map (e.g., selecting the *Treaty of Oakhaven* event instantly turns the faction connection line from red to green on the canvas).

---

## 🔄 How the Data Flows Under the Hood

To keep this highly usable, the user workflow follows a clean circle:

```
[ ✍️ DM Writes Wiki Article ] 
            │
            ▼ (Saves structural text & metadata)
[ 💾 Relational Database Core ] 
            │
            ▼ (Projects data dynamically based on Calendar Year)
[ 🗺️ World Page Visual Lens ] (Diplomacy Web / Dynasty Swimlanes)

```

This requirements framework keeps the platform grounded in easy-to-manage text editing, but elevates it into an incredibly immersive world-state simulator when players or GMs interact with the top-level World canvas.

Now that these three fundamental pillars are locked in, would you like Cursor to generate a structured implementation plan specifically for wiring the **Chrono-Scrubber** slider into your frontend canvas component?