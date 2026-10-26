---
title: "ADR 0012: Independent gap-filler; compat as the single integration layer"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user. **It amends [ADR 0005](../0005-custom-mod-vs-existing-mods/) and [ADR 0010](../0010-four-repositories/)**, which said the gap-filler hard-depends on core and its mobs join sieges through a core tag. The amended parts carry status notes there. Its two sub-questions (sections 2 and 5) were resolved by the user on 2026-10-20. **Amended by [ADR 0015](../0015-compat-without-build-dependencies-on-target-mods/)):** compat → target mods (gap-filler included) becomes a runtime-only relation; compat compiles against no target, and the gap-filler exposes activity as block state so compat maps it with data.
- **Context:** The user wants the gap-filler built like any other tech mod, with no dependency on core, so it can be reused in other packs. Compat becomes **the** standard integration layer: everything else reaches pollution through it, including the gap-filler's own machines and mobs.

## Decision

### Dependency graph

```
core (pollutioncraft)     → nothing
gap-filler                → nothing
compat                    → core (`…api.*` only) + each target mod (GTM, Mekanism, AE2, gap-filler, …), each optional
                            (ADR 0015, accepted: runtime only, never on compat's compile classpath)
pack                      → pins exact versions of all three
```

- The gap-filler doesn't know core exists. Compat is the only place where "a mod" and "pollution" meet.
- **Naming:** the provisional id `pollutioncraft_content` suggests a dependency that no longer exists. It should get a neutral name of its own, chosen by the user later.

### 1. Siege-eligible gap-filler mobs

- Core still owns the **mechanism**: the `pollutioncraft:siege_eligible` entity tag plus the config list ([ADR 0006](../0006-mob-siege-rules/)).
- **Compat owns the data** that adds the gap-filler's mobs (and any other mod's mobs) to that tag. Compat ships the tag entries as data, marked optional, so a missing mod does not break loading. **Assumption:** vanilla tag files support optional entries (`"required": false`); verify in the first compat task.
- If a gap-filler mob needs behaviour beyond the generic siege goal, that code also lives in compat, behind the adapter rule.
- The gap-filler ships **no** `pollutioncraft` tags or data.

### 2. Data-driven emitters (option D): resolved, all mappings in compat

| Option | For | Against |
| --- | --- | --- |
| a. Engine, format, and vanilla mappings in core; other mappings in compat (my earlier recommendation) | Core works standalone; M1 is testable in core alone | Core still contains game data, so not everything goes through compat |
| **b. Engine and format in core; ALL mappings in compat, vanilla included** | Strictly one integration layer. Core is a pure mechanism. | Core alone emits nothing (see below) |
| c. Everything in core | Simplest | Breaks the user's rule |

**Decision (user, 2026-10-20): (b).** This reverses my recommendation of (a).
- **Core** owns the emitter engine (it reads mappings, watches block-state flags, and calls the field) and the mapping **format** (config/datapack schema). It ships **no mappings**.
- **Compat** owns **every** mapping, vanilla included (the furnace first; smoker, blast furnace, and others later, see [architecture 3.3](../../architecture/#33-key-flows)), in a `…compat.minecraft` data package next to `…compat.gtceu` and the others.
- Pack-specific tuning (rates) goes in the pack's config or datapack, which overrides compat's defaults.

**Consequences:**
- **Core alone emits nothing.** Without compat (or a pack datapack that supplies mappings), only the Emitter API (other mods' code) and the `/pollution set` command change pollution. Core becomes a framework, not a playable standalone mod. Core's default siege list (zombies, [ADR 0006](../0006-mob-siege-rules/)) is unaffected: it is mechanism config, not an emitter mapping.
- **How M1 is tested:**
  - **Alpha:** the compat package sits inside core ([ADR 0005](../0005-custom-mod-vs-existing-mods/)), so the core mod jar ships `…compat.minecraft`. The M1 GameTest (lit furnace raises pollution; unlit furnace adds none) runs in core's CI with the real vanilla mappings.
  - **Core's own tests** must not depend on compat. They use a **test-only mapping** in the test resources (for example a test block with an `active` flag), which exercises the engine and format in isolation. They also call the Emitter API directly. This keeps the adapter rule ("core passes its tests with no target mod") true after the split.
  - **After the split:** the vanilla M1 GameTest moves with `…compat.minecraft` to the compat repo, whose CI runs core and compat together. Core keeps its engine tests.
- The split trigger is unchanged. The vanilla mappings are data only, so they don't count as a "code adapter".

### 3. Compat is required for a working pack

Compat is no longer optional for **our** pack. Without it, **nothing** emits (not even vanilla furnaces, see §2), and non-vanilla mobs never siege. Core alone loads and keeps its mechanics (field, siege of tagged vanilla mobs, commands), but has no emission sources. Other packs may use the gap-filler without core or compat. The pack always pins all three.

### 4. Alpha

Unchanged from [ADR 0005](../0005-custom-mod-vs-existing-mods/):
- Compat ships as an isolated package inside core.
- The adapter rule applies: own package, `ModList` check, imports from `…api.*` only, core's tests pass with no target mod installed.
- The split triggers are the same: a second code adapter, or GTM updates forcing core releases.
- The gap-filler is post-alpha. When it starts, any adapter that needs code counts as a second code adapter, so compat will usually split out then. A data-only adapter (tags, emitter mappings) does not trigger the split.

### 5. Gap-filler features that need pollution state

**Rule: any feature that reads or changes pollution lives in core (generic mechanics) or compat (the bridge), never in the gap-filler.** Examples:

| Feature | Gap-filler provides | Compat or core provides |
| --- | --- | --- |
| A scrubber or filter machine (a future M5 mitigation) | A generic machine with an observable activity signal (block state, capability, or its own event) and no pollution code | Compat maps the activity to pollution removal through core's API. **API gap:** core needs a removal/scrub call (for example `scrub(level, pos, amount)`), to be added with M5. |
| A pollution meter or display | — (the gap-filler can't know the value) | Core or compat, since it needs the Read API |
| Mobs that react to pollution | A normal mob | Compat (tag membership, extra goals) or core (generic behaviour) |

**Resolved (user, 2026-10-20):** accepted. In packs without core and compat, gap-filler machines with pollution-related roles do nothing beyond their primary function.

## Consequences

**Benefits:**
- The gap-filler is reusable.
- There is one integration layer to audit for loopholes (goal 4: every machine mapped).

**Costs:**
- Compat's surface grows; it becomes a required, frequently released mod.
- The gap-filler must expose observable activity signals for compat to read.
- The gap-filler publishes its own mod jar (one artifact) ~~for compat to compile against~~ *(amended by ADR 0015: compat never compiles against it; it maps the gap-filler's block-state signals as data)* ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/)).

## Blast radius / reversibility

Repo dependencies, compat's scope, and where tags and emitter data ship. Adding a core dependency back to the gap-filler later is easy; removing it later would not be.

## Revisit if

- Compat becomes a bottleneck (too many unrelated targets). Then consider one compat module per target family.
- The gap-filler is never reused outside our pack.
