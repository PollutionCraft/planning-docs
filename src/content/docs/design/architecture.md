---
title: Architecture
status: proposed
owner: Mimir
---

Design for the v0.1 alpha (M1–M4 in the [brief](../../brief/overview/)), plus the structure M5–M7 will plug into later. Engineering's view of the same problem is in [Engineering feasibility](../../plan/feasibility/). Section 10 tracks alignment with it. **This page reflects every decision recorded up to 2026-10-22.** Everything still waiting on the user is listed in section 9.

**Decision status (2026-10-22):**

| ADR | Topic | Status |
| --- | --- | --- |
| [0001](../decisions/0001-minecraft-version-and-loader/) | Version and loader: **MC 1.21.1, NeoForge 21.1.264 (pinned), Java 21, GTM `8.0.0-SNAPSHOT+20261017-095459-36a6b38` pinned by hash**. 1.20.1 Forge is the rejected fallback. | **accepted** |
| [0002](../decisions/0002-pollution-model-global-local/) | Hybrid model with global pressure | **accepted** (may be reworked later) |
| [0003](../decisions/0003-storage-and-simulation/) | Grid, storage, spread, and simulation scope | **accepted** (the "freeze when nobody is online" gate for simulation and attacks is still a recommendation; §9 Q2) |
| [0004](../decisions/0004-absorption-anti-spam/) | Three-layer anti-spam rule | **accepted** (for now) |
| [0005](../decisions/0005-custom-mod-vs-existing-mods/) | Build our own mods; three mods as the target, core with in-core compat in the alpha; adapter rule; split trigger | **accepted** (repo part superseded by 0010; gap-filler parts amended by 0012) |
| [0006](../decisions/0006-mob-siege-rules/) | Siege rules | **accepted** (land claims open; §9 Q4) |
| [0007](../decisions/0007-tech-tree-and-mod-list/) | Tech tree: GregTech-led; Create allowed, not primary; others bringable later | **accepted** (cutoff stage and mod list open) |
| [0008](../decisions/0008-siege-in-unattended-chunks/) | Where siege mobs come from in loaded chunks with no player nearby | proposed (user decides; §9 Q1) |
| [0009](../decisions/0009-licensing/) | Licences: mods LGPL-3.0, pack MIT | **accepted** |
| [0010](../decisions/0010-four-repositories/) | Four repos (core, compat, gap-filler, pack); supersedes ADR 0005's one-repo part | **accepted** |
| [0011](../decisions/0011-cross-repo-artifacts-and-versioning/) | Artifacts, semver, cross-repo CI and releases. **Decided by the user:** one artifact per repo (§1), two-tier publishing (§4), platform releases deferred behind `PUBLISH_PLATFORMS` (§8.1), AI disclosure (§8.2). | proposed (§§2–3, 5–7 for confirmation; §8.2 conflict and §8.3 open) |
| [0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) | Independent gap-filler; compat is the single integration layer (amends 0005, 0010) | **accepted** |
| [0013](../decisions/0013-java-package-namespace/) | Base package and Maven group `io.github.pollutioncraft` | proposed (§9 Q11) |
| [0014](../decisions/0014-licence-spdx-id/) | SPDX id `LGPL-3.0-only` for our mods (refines 0009) | proposed (§9 Q11) |
| [0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/) | Compat reaches target mods with **no build-time dependency**, via the ordered **integration ladder**: data mapping → observe-only string-targeted Mixin → other options → reflection last (user's order). GTM lands on the Mixin rung; GTM leaves core's build and the pack holds the only GTM pin. Applies to **every** repo; allowed build deps are only internal artifacts, Minecraft modding requirements (Minecraft, NeoForge/FML, MDG, Parchment, Mixin/MixinExtras), and generic Java utilities. CI may download the pack's pinned target jars for tests. Supersedes parts of 0005, 0011, 0012 and task 001's GTM setup. | **accepted** |
| [0016](../decisions/0016-gtm-activity-hook-shape/) | GTM hook shape after spike 003: accessor interface instead of `@Shadow`, linkage-error guard that disables the adapter, `RETURN` plus de-duplication, server only, exact-version gate while GTM is a snapshot. Amends 0015 in part. | **accepted** (2026-10-27) |

This page stays `proposed` until 0008 and 0011 are decided. Where it describes an accepted ADR, that ADR is authoritative.

Labels: **Fact** (read from a source this session; cited), **Assumption** (to verify, usually by a named spike), **Recommendation** (my proposal; the user decides).

## 1. Problem and constraints

- **Fact (brief):** Machines emit pollution (M1). It spreads and accumulates (M2). The world absorbs it (M3). Above a threshold, mobs path to the source and break blocks (M4).
- **Fact (brief, alpha scope):** the v0.1 alpha is M1 (furnace first, then the vanilla set, the furnace minecart and GregTech machines last; user, 2026-10-27), M2, M3, M4, and the lose condition.
  - **Out of the alpha:** defenses (M5), tech gating (M6), mob evolution, mob variety, nests, and environment changes.
  - M7 (the net-zero cutoff) comes later. The design must not block any of these.
- **Fact (brief):** Target players are solo players and small co-op groups, in PvE.
- **Fact (brief):** Losing a base is not game over. A new base elsewhere must stay playable.
- **Fact (user, 2026-10-20):**
  - Local pollution is stored per **one Minecraft chunk: 16 × 16 blocks, full world height**.
  - Spread rate and spread interval are configurable.
  - The hybrid model with a global "pressure" is accepted for now.
  - Global time must not advance on a dedicated server while nobody is online, and pressure never decreases.
  - Any loaded chunk can be attacked, however it is loaded.
- **Fact (user):** GregTech is not strictly required, but it is a strong thematic fit and the preferred primary tech tree.
- **Fact (user, 2026-10-22):** the platform is **Minecraft 1.21.1, NeoForge 21.1.264, Java 21**, with GTM `8.0.0-SNAPSHOT+20261017-095459-36a6b38` pinned by hash. This was decided after the user validated the snapshot manually in Prism ([ADR 0001](../decisions/0001-minecraft-version-and-loader/)).
- **Fact (user):** Thermal Expansion and IC2 are **removed** as integration targets: neither has a usable build ([ADR 0007](../decisions/0007-tech-tree-and-mod-list/)). Substitutes are wanted (§9).

## 2. Prior art

### 2.1 GregTech and loaders (version question)

**Facts** (GitHub API and Modrinth API, read 2026-10-20):

| Target | GregTech CEu Modern (GTM) status |
| --- | --- |
| **1.20.1 Forge** | Default branch of the official repo. Numbered releases through **v7.5.3 (2026-04-12)**. Rolling `latest-1.20.1` snapshot labelled 8.0.0 (2026-10-15). 185 open issues labelled `1.20.1`. |
| **1.21.1 NeoForge** | Official `1.21` branch, at least 100 commits since 2026-07-20, the latest on 2026-10-17. Rolling `latest-1.21` snapshot labelled **8.0.0** (2026-10-17). **The last numbered release is v7.0.2, from 2025-07-20.** 72 open issues labelled `1.21` or `1.21.1`. The README states "MinecraftForge (1.20.1) & NeoForge (1.21.1+)". |
| 26.x (the newest MC) | Official `26.1` branch, last commit 2026-04-28. No release. **Not viable today.** |
| Fabric | One 2024 alpha for 1.20.1. **Not viable.** |
| Forks | "GregTech Modern Reborn" (1.21.1, 8.1.0, Feb 2026) and other unofficial rebuilds. Not recommended: they split the support base. |

**How far along is 1.21.1?** (Facts unless labelled.)
- **Same feature line.** The v8 codebase was ported to 1.21 in April 2026 (PR #4760). Since August 2026, maintainers have merged a forward-port from 1.20.1 to 1.21 roughly every month (PRs #5244, #5395, #5409, #5433, and #5477 "Port 1.20 to 1.21, September edition", merged 2026-10-09). Both branches' snapshots carry the same version label, 8.0.0.
- **1.21-only work is still open:** deferred material registration (#5414, open), registry rework (#5160, open), a DataFixerUpper-based save migration with failing tests (#4875, open), and the 1.21 docs update (#5458, open). A startup crash with several other mods on the 8.0.0 snapshot is open (#5293, from 2026-08-14).
- **No release date found.** There is no milestone on GitHub, and searches found no maintainer statement giving a date for 8.0 or for 1.21 parity. The maintainers' plans issue (#5515) lists content ideas, with no dates. **Open question:** the GTCEu Discord (`modern-dev-talks`) is the likely place for an estimate; I could not read it.
- **Assumption (my estimate, low confidence):** the code is at feature parity about one forward-port behind 1.20.1 (roughly one month). The gap is release stability, not features. A numbered 8.0 for 1.21.1 most likely waits for the registry and data-fixer work above. I cannot put a date on it.

**Other candidate tech mods** (Modrinth API, plus CurseForge file pages for Thermal and IC2, read 2026-10-20):

| Mod | 1.20.1 Forge | 1.21.1 NeoForge | Notes |
| --- | --- | --- | --- |
| Create | 6.0.8 (2025-11-02) | 6.0.10 (2026-04-21) | Both current |
| Mekanism | 10.4.16 (2025-05-21) | 10.7.19 (2026-04-10) | 1.21.1 is the active line |
| AE2 | 15.4.11 (2026-09-27) | 19.2.18 (2026-09-27) | Both current. Alphas also exist for 26.x. |
| Thermal Expansion | 11.0.1 (**2024-05-26**, latest file) | **None official** | Development has stalled on both. The CurseForge page still shows 1.19.2 as "active". |
| IC2 Classic | **None** (latest is 1.19.2, 2026-07-31) | **None** | Only unofficial or AI-assisted remakes exist (for example "IC2: Nostalgia" and "IC2R" for 1.21.1, `ic2port` for 1.20.1). Not recommended. |
| IC2 Experimental | **None** found | **None** | Same remakes as above |
| Immersive Engineering | 10.2.0 (2025-02-18) | 12.4.2 (2025-07-05) | Both available |
| Modern Industrialization | — (Fabric only) | 2.5.10 (2026-10-07) | GT-like alternative spine |

**Conclusion:**
- GregTech allows **1.20.1 Forge or 1.21.1 NeoForge**.
- Thermal and IC2, which the user named for integration, have **no official build on either target**. Thermal exists only on 1.20.1, as a 2024 file.
- **Decided:** 1.21.1 NeoForge, after spike 006 and the user's Prism validation. 1.20.1 Forge is the fallback. Accepted risks: GTM [#5293](https://github.com/GregTechCEu/GregTech-Modern/issues/5293) (startup crash with other mods), [#5447](https://github.com/GregTechCEu/GregTech-Modern/issues/5447) (solid boilers), and no 8.0 release date. See [ADR 0001](../decisions/0001-minecraft-version-and-loader/).

### 2.2 Pollution systems

| System | What it does | Borrow | Diverge, and why |
| --- | --- | --- | --- |
| **Factorio** (game, 60 UPS) | Pollution per 32×32-tile chunk, updated every 64 ticks (about 1.07 s). A chunk at ≥15 pollution spreads 2% to each cardinal neighbour. Terrain and trees absorb, with tree damage capped. Spawners spend absorbed pollution to send attack groups to the source. Evolution comes from time, **gross** pollution produced, and spawner kills, squashed as `e = t/(1+t)`. | Threshold-gated diffusion to 4 neighbours; absorption bounded per chunk; gross emission drives the global factor; squashing; **attack groups formed from pollution** (ADR 0008); mobs move to the source. | Our grid is one Minecraft chunk (16×16 blocks). There are no nests in the alpha. Minecraft unloads chunks; Factorio does not. |
| **GT New Horizons** | Per-chunk pollution updated every 60 s. Spreads above 400,000 to neighbours under 5/6 of the source, moving 1/20 of the difference. 0.55% decay per cycle. Smog, poison, and vegetation and acid-rain effects. Mufflers reduce emission by tier. | Gradient-limited spread (as a config option); natural decay; tiered emission reduction (future M5). | Effects hit players and terrain, not mobs. |
| **GTM environmental hazards** (code read, `1.20.1` branch) | `EnvironmentalHazardSavedData`: per-level `SavedData` map `ChunkPos → HazardZone`. Zones above 1,000 send 20 to each of 4 neighbours. Decays 0.001 per tick. Emitted only by muffler hatches. Affects players. **Off by default.** | Storage shape. | Keep it disabled; one pollution model only. |
| **Pollution of the Realms** | Drifting pollutant clouds, filters, purifiers, effects. ARR. | Visible-pollution ideas (later display). | Heavier model; no mob link. |
| **Create: Smog** | Per-chunk number; **config-driven emitters (block ID/tag → rate)**; scrubbers. MIT. | Config-driven emitters. | Create-only; no mobs. |

### 2.3 Mob behaviour

| System | What it does | Borrow / diverge |
| --- | --- | --- |
| **Improved Mobs** | Breakable blocks treated as passable in pathfinding; ARR; no external target API on its page. | Borrow the pathfinding idea; build our own goal ([ADR 0005](../decisions/0005-custom-mod-vs-existing-mods/)). |
| Vanilla zombie door breaking; raids | Progress-based breaking; a group spawned and sent to a target location | Model for break progress and for siege groups ([ADR 0008](../decisions/0008-siege-in-unattended-chunks/)). **Assumption:** details confirmed in spike [004](../../plan/tasks/004-spike-siege-ai/). |

## 3. Architecture

### 3.1 Components

Per [ADR 0005](../decisions/0005-custom-mod-vs-existing-mods/) (mods, adapter rule), [ADR 0010](../decisions/0010-four-repositories/) (repos), [ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) (artifacts; proposed), and [ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) (dependency graph):

```
repo: pollutioncraft (core mod)                       LGPL-3.0
├── core     plain-Java library, INTERNAL (bundled in the mod jar, not published)
│            PollutionField · DiffusionStep · AbsorptionModel · GlobalPressure · AggressionPolicy
├── api      …api.* packages: the public contract, bundled into the mod jar (not published separately)
└── mod      pollutioncraft-1.21.1 = the repo's ONE artifact (contains …api.*) → GitHub Packages
             (snapshots + releases) + GitHub Release; Modrinth/CurseForge when switched on
             storage · scheduler · API impl · emitter engine + mapping format (no mappings) ·
             absorber sampler · siege AI · siege groups · commands · config
             └── compat.*       alpha only, moves to the compat repo later:
                 compat.minecraft (vanilla emitter mappings, data) · compat.gtceu (GTM adapter, behind the GTM version gate)
                 · compat.common (mixin config plugin, version gate) · compat.gtceu.mixin (observe-only @Pseudo mixin)
                 No target mod on any compile classpath (ADR 0015).

repo: pollutioncraft-compat   (later)  THE integration layer: code adapters, tag entries, and
                                       ALL emitter mappings (vanilla too) for every mod (incl. gap-filler)   LGPL-3.0
repo: gap-filler (name TBD)   (later)  standalone tech mod: new mobs, missing content; no core dep   LGPL-3.0
repo: modpack                 (exists) packwiz; pins exact versions of all three; needs compat      MIT
```

**At the alpha, only the core-mod repo and the pack repo exist** (user confirmed 2026-10-22; [ADR 0010](../decisions/0010-four-repositories/)). The compat and gap-filler repos are created when they split out or start.

**Dependency direction** ([ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/)):
- **core → nothing.** It never imports compat or the gap-filler. Standalone it loads, but **emits nothing**: it ships no emitter mappings, not even vanilla ones ([ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §2).
- **gap-filler → nothing.** It is a normal tech mod, reusable in other packs, and contains no pollution code or tags.
- **compat → core (`…api.*` only) + each target mod** (GTM, Mekanism, AE2, gap-filler, …), each optional. It is the only place where another mod meets pollution. **Per [ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)):** the target-mod relation is **runtime only**: compat compiles against core and nothing else; target mods are reached through the integration ladder (data mapping, then Mixin, then other options, then reflection), each gated on the target being loaded.
- **Pack → pins all three.** Compat is **required** for our pack: without it nothing emits and non-vanilla mobs don't siege.
- **Rule:** any feature that reads or changes pollution lives in core (generic) or compat (bridge), never in the gap-filler. A gap-filler scrubber, for example, exposes an activity signal, and compat turns it into pollution removal. That needs a removal call in core's API, to be added with M5.

**Publishing ([ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §4, user decision):**
- Tier 1, snapshots: GitHub Packages only. Reading needs a token: `GITHUB_TOKEN` in CI, a classic PAT with `read:packages` locally.
- Tier 2, releases: GitHub Packages and a GitHub Release, plus CurseForge and Modrinth behind the `PUBLISH_PLATFORMS` switch (default **off**; the user deferred platform releases, ADR 0011 §8.1). Modrinth is additionally subject to its AI-content rule (§8.2; §9 Q5).

The same scheme applies to compat and the gap-filler.

**One artifact per repo** (ADR 0011 §1). Compat compiles against an exact version of the core mod jar `pollutioncraft-1.21.1` from GitHub Packages ~~plus the gap-filler's mod jar~~ (ADR 0015: core only), and declares a runtime range `[X.Y, X+1)` on core. Because the jar also contains internals, the contract is enforced by **build checks**, not the compiler:
- **API purity in core:** `…api.*` must not reference our internal packages.
- **Adapter imports** (core's `…compat.*` now, compat later): only `…api.*` may be imported from our mod.

Semver covers only `…api.*`. Third parties use the same jar: from GitHub Packages with a PAT, or anonymously from CurseMaven or Modrinth Maven once platform publishing is on. A separate API artifact or classifier jar may come later (revisit trigger: the compat split or third-party addons). The pack pins our mods by exact version and hash from the GitHub Release asset (or CurseForge, or Modrinth once publishing is on), **never from GitHub Packages**: players' installers have no token.

**Licences:** the mods are LGPL-3.0 and the pack repo is MIT ([ADR 0009](../decisions/0009-licensing/)).

**Pack distribution (alpha; [feasibility 3](../../plan/feasibility/)):**
- The pack is distributed through **GitHub Releases of the pack repo only**. Each release has a `.mrpack` (Prism) and a CurseForge `.zip`, for testers.
- The pinned GTM snapshot jar is re-hosted on our own release, because GTM's `latest-1.21` URL is rolling.

**Boundary rules:**
- `core` holds every formula and is unit-tested.
- The platform layers only read the world, call `core`, and act.
- Adapters (inside core in the alpha, in compat later) import only `…api.*` (section 3.5), never internals. The gap-filler does not touch our API at all; compat bridges it.

### 3.2 Data model

Grid unit: **one Minecraft chunk (16 × 16 blocks, full height)**, keyed by chunk X/Z. One sparse map per dimension, stored as `SavedData` ([ADR 0003](../decisions/0003-storage-and-simulation/)).

| Field (per chunk) | Type | Meaning |
| --- | --- | --- |
| key | `long` (ChunkPos packed) | Chunk identity |
| `absorbable` | `double` | Pollution that absorbers can remove |
| `persistent` | `double` | Pollution only fixed decay removes. Always 0 in the alpha; used for M7 ([ADR 0004](../decisions/0004-absorption-anti-spam/)). |
| `emittedLastInterval` | `double` | Gross emission in this chunk last interval |
| `dominantSource` | `long` (BlockPos) + `double` rate | Highest-rate emitter last interval; the siege target |
| `lastIntervalStats` | `ChunkIntervalStats`, transient, **never saved** | `spreadIn`, `spreadOut`, `absorbed`, `decayed` (PU) from the last interval; read by the debug `rates` command and the F3 overlay. For a chunk that survives pruning: Δlocal = `emittedLastInterval + spreadIn − spreadOut − absorbed − decayed`. The sub-`epsilon` remainder of a pruned chunk is dropped and not recorded. |
| `absorberCache` | per-type counts + `sampledAtActiveTick` | Last absorber sample; used while the chunk is unloaded |

Per world, the global record:

| Field | Type | Meaning |
| --- | --- | --- |
| `activeTicks` | `long` | Server ticks during which **at least one player was online**. Our own counter (section 3.6). |
| `grossEmitted` | `double` | Total pollution ever emitted. Never decreases. |
| `pressure` | derived `double` in [0, 1) | `raw/(1+raw)`, with `raw = a·activeTicks + b·grossEmitted`. Never decreases, because both inputs only grow. |

Both records carry a `dataVersion` int. Local pollution = `absorbable + persistent`.

**Stored shape (task 007).** Two `SavedData` files, plain NBT compounds:

- **Per dimension**, `pollutioncraft_field` in that dimension's data storage. It holds the columns, not one compound per chunk: `dataVersion` (int, currently 1) and six `long[]` tags of equal length, sorted by `keys`. They are `keys` (packed ChunkPos), `absorbable`, `persistent`, `emitted` (= `emittedLastInterval`), `dominantPos` (packed BlockPos) and `dominantRate` (the two parts of `dominantSource`). Doubles are stored as raw IEEE-754 bits, so a round trip is lossless. That is 48 B per chunk raw: at 2,500 chunks, 120 KB raw and 43,919 B measured on disk, within the budget in section 5. `lastIntervalStats` is never saved. `absorberCache` is not stored yet: the absorber task adds it as a new column and bumps `dataVersion`.
- **Per world**, `pollutioncraft_world` in the overworld's data storage. It holds `dataVersion` (int), `activeTicks` (long) and `grossEmitted` (double).
- **On load** (the error convention in section 4):
  - A field entry with a NaN, infinite or negative amount, or a duplicate key, is skipped and logged.
  - Entries past the shortest column are skipped and logged.
  - **Downgrade protection.** An unreadable record is kept as the original tag, flagged `isPreserved()`, and written back unchanged on save. It is never overwritten or reset, so downgrading the mod cannot destroy pollution data or reset the never-decreasing `pressure`.
    - Field record: unreadable means `dataVersion` is missing, not an int, or not the supported version.
    - World record: unreadable also covers `activeTicks` or `grossEmitted` missing or of the wrong tag type, and invalid values (negative ticks; NaN, infinite or negative `grossEmitted`).
  - **A preserved dimension is not simulated.** A preserved world record stops `activeTicks` and the whole simulation, and an error is logged at load. `stepNow` does nothing in either case, and nothing is merged into a preserved record.
  - In-memory, a preserved world uses a fresh record that is never saved, so `getPressure` reads 0 for that session.
  - **Binding on task 010 and every later writer:** `isPreserved()` means "refuse writes". Emissions to a preserved dimension or world are dropped, not buffered into it.

### 3.3 Key flows

**Emission (M1).** An emitter calls `PollutionApi.emit(level, blockPos, amount)` only while its machine works. The call adds to a pending buffer. When the interval that drained it commits, `dominantSource` and `grossEmitted` are updated. If that interval is dropped, the drained emissions are re-queued for the next one (task 010), so nothing is lost or counted twice. Emitter sources, in order of preference:
1. **Config/datapack-driven** (no code): `block id or tag → rate`, active while a configured boolean block-state property (for example `lit` or `active`) is true. **Decided** ([ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §2): core owns the engine and format only; **all** mappings, vanilla included, ship in compat as data (`…compat.minecraft` and so on). Core's own tests use a test-only mapping. The vanilla M1 GameTest runs with the in-core compat package during the alpha, and in the compat repo after the split.
   - **Engine (task 011, accepted):** the engine tracks the positions of mapped blocks per loaded chunk (chunk-load scan, neighbour-update events, and a bounded 60 s rescan as a safety net). At each interval start it reads each tracked block's state and calls `emit` for those whose `active_when` matches, times `emissionMultiplier`. So emission is sampled once per interval: one lit furnace for one interval is 1 PU, and a pulse shorter than an interval can alias. Only block-ticking chunks emit. `/pollution step` does not run the engine.
   - **Data path convention:** `data/<namespace>/pollution_emitters/<target mod id>/<name>.json`; shipped mappings use namespace `pollutioncraft`. The `<target mod id>` folder is what "the `…compat.minecraft` package" means for data, and it moves with its adapter at the compat split. Format: `docs/emitter-mappings.md` in the mod repo.
   - **Vanilla rollout (user decision, 2026-10-22):** the **furnace comes first**, as the first slice. It is the only mapping and the only M1 GameTest target at first. **Wider set (user decision, 2026-10-27; rule: a block emits if it burns something):** blast furnace and smoker (`lit`, like the furnace), campfire (`lit`, low rate), and torches, wall torches and lanterns (much lower rate, **always active** because they have no off state). Soul campfire, soul torch, soul lantern and the redstone-type parts are out (candles, jack o'lanterns, lava and fire too, unless added); copper lantern is not on 1.21.1. These need two engine additions, built first in task 031: an entry without `active_when` means always active, and a per-chunk cap on tracked positions (config key `maxTrackedPerChunk`, working name). The mappings are task 029. The furnace minecart is an entity, so it is its own task (032) with a design gate, built after P2 absorption (user, 2026-10-27). Rates are placeholders for the P4 playtest (task 029 lists them).
   - **Assumption:** the furnace exposes a `lit` block-state property; the smoker and blast furnace are expected to as well. Not checked this session; the first slice verifies it for the furnace.
2. **Code adapters** (compat: an isolated package in core for the alpha, the compat mod later) for mods whose activity is not visible in block state. GTM is the first, via spike [003](../../plan/tasks/003-spike-gregtech-activity-hook/). **Per [ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)): no compiled code against the target; every new mod goes down the integration ladder, in order, stopping at the first rung that fits:** (1) data mapping; (2) an observe-only, string-targeted `@Pseudo` Mixin with `remap = false`, gated by a mixin config plugin that checks `LoadingModList` and the target version; (3) other options (NeoForge capabilities/events, the target's own hooks); (4) reflection, last. Rates are always data; rungs 2–4 only supply an activity signal, and the adapter turns it into `emit` calls through `…api.*` (a shared `setActive`-style API call is deferred, [ADR 0016](../decisions/0016-gtm-activity-hook-shape/) §5). The rung criteria are in the ADR. **GTM:** **Fact (pinned jar, `javap`):** single-block machines have no activity block state (`MetaMachineBlock` adds only facing properties; `active` is a model property), and only `ActiveBlock` casings (coils, fusion casings) toggle a real `active` block state. So rung 1 fails (it would miss machines and double count casings), and GTM goes to **rung 2**. **Spike 003 confirmed it** ([findings](../../plan/tasks/003-findings/)); the hook's shape is [ADR 0016](../decisions/0016-gtm-activity-hook-shape/) (accepted):
   - `@Pseudo` mixin on `…api.machine.trait.recipe.RecipeLogic`, `@Inject` at `RETURN` of `setStatus(Status)`, `require = 0`. It fires for single-block machines and at the controller's position for multiblocks. Measured: 99–164 ns per call, about 0.01 ms/tick at 100 working machines.
   - **Not `@Shadow`** (refused for the superclass members `getBlockPos()`/`getLevel()`): the mixin implements our accessor interface `…compat.gtceu.GtActivityView` (`isWorking()`, `getBlockPos()`, `getLevel()`; Minecraft types only), and the mixin body is one call to a static handler, passing `this` cast to it.
   - The handler wraps everything in a `try`: any throwable except `VirtualMachineError` disables the adapter for the session with one log line (section 4, Errors).
   - **De-duplicated:** `RETURN` fires on every call, including GTM's per-tick `setStatus(WORKING)`. Only a change of the per-position working flag reaches the adapter's working set. The per-tick calls are kept on purpose, so a working machine re-registers after its chunk reloads (assumption, spike 003b).
   - **Server only:** the handler can be reached on the client (the `isRemote` early return is also a `RETURN`), so it returns on a client level before touching any state: no de-duplication entry, no working-set change, no `emit`.
   - **Working set and emission:** adapter-local, no API change for the alpha. Dropped on chunk unload and level unload, validated each interval (the block must still be a mapped GTM block id). Each working position calls `PollutionApi.emit` once per interval at its data-mapped rate. The `setActive`-style API call mentioned above is deferred until a second code adapter needs it.
   - **Version gate:** an exact list of verified GTM version strings in `…compat.gtceu` while the pack pins a snapshot (today `8.0.0-SNAPSHOT+36a6b38`); a range once it pins a release. A pack GTM pin bump needs a mod PR with a green with-targets run and a mod release first (ADR 0016).
   - **Not yet proven; conditions for task 012, not decided:** client-side behaviour (manual check in the Prism instance), electric single-block machines, an electric multiblock with a muffler hatch, and chunk unload / block break of a working machine (spike 003b).

**Interval step (M2, M3).** Every `spreadIntervalTicks` (config; **default 20 = 1 s**, since Minecraft runs at 20 ticks per second), the scheduler snapshots the field and processes it in slices across that interval. For each chunk, computed from the snapshot so the order does not matter:
1. Add the pending emissions.
2. **Spread:** if local ≥ `spreadThreshold`, send `spreadFraction × amount` (config; **default 0.02**) to each of the 4 neighbours, for both pools. Config validation rejects `4 × spreadFraction ≥ 1`.
3. **Absorb:** remove `min(absorbable, capacity(chunk))` (ADR 0004 curve).
4. **Decay:** remove `persistentDecay × persistent`.
5. Prune chunks below `epsilon`.

Apply the deltas at the end of the interval. **Determinism contract:** the same snapshot and config always give the same result.

> Factorio's 64 ticks at 60 UPS is about 1.07 s, so 20 Minecraft ticks keeps Factorio's real-time pace. The previous draft's default of 64 ticks would have been 3.2 s; corrected.

**Absorber sampling (M3).** On chunk load, and then round-robin over loaded chunks (at most once per chunk per 10 minutes), the sampler reads the top surface block of each of the 256 columns. It counts tagged absorber blocks and tagged living entities, then caches the result. Unloaded chunks use the cache; never-sampled chunks use `defaultCapacity`. See [ADR 0004](../decisions/0004-absorption-anti-spam/).

**Aggression (M4).** A chunk is aggressive when `local ≥ T0 × (1 − k·pressure)`, with `0 ≤ k < 1`. A chunk with no local pollution is never aggressive. `pressure` also scales an **intensity**: the cap on sieging mobs, break speed, and siege-group size. See [ADR 0002](../decisions/0002-pollution-model-global-local/).

**Siege (M4).** Eligibility: the mob's type is in the siege list (config list plus tag; default: the zombie family; custom mobs allowed), and the chunk is **loaded and entity-ticking** and aggressive. Behaviour:
1. **Target:** a player in sight, else the `dominantSource` in this chunk, else climb toward the most-polluted neighbouring chunk.
2. **Break through:** path to the target. If blocked, break the blocking block over time, then repath. Allowed blocks: hardness ≥ 0 and ≤ `maxBreakHardness`, not tagged `siege_immune`. **The `mobGriefing` gamerule is ignored** (user decision); our own config `siege.breakBlocks` is the off switch. Broken blocks **drop items by default** (`siege.dropItems = true`).
3. **Destroy:** break the source block.

Limits: per-source and global caps on sieging mobs, a repath cooldown, and a maximum path distance. See [ADR 0006](../decisions/0006-mob-siege-rules/).

**Siege groups (M4, proposed in [ADR 0008](../decisions/0008-siege-in-unattended-chunks/)).** In aggressive, loaded chunks, the mod periodically spawns a siege group at the edge of the polluted area. Each group's cost is paid out of local pollution, as in Factorio. The mobs are persistent, so they do not despawn when no player is near. This is what makes a chunk-loaded base with nobody nearby attackable.

### 3.4 Pollution simulation vs attack eligibility

These are two separate rules:

| | Pollution simulation (numbers) | Attacks (mobs) |
| --- | --- | --- |
| **Where** | Every stored chunk, loaded or not. Never loads or generates chunks. | Only chunks that are **loaded and entity-ticking**, for any reason: player nearby, chunk loader, or forced. |
| **When** | Only on ticks with ≥ 1 player online (same gate as `activeTicks`). | Same gate. |
| **Why** | Pollution keeps spreading and decaying around a base that has been left alone, at low cost. | Mobs exist and act only in ticking chunks. Siege groups (ADR 0008) supply mobs where natural spawning does not. |

- **Recommendation:** gate everything on "≥ 1 player online", so the world is frozen whenever the server is empty. That matches the user's rule for `activeTicks` and prevents a base from being wiped while everyone is offline. **Question for the user:** confirm. The alternative is to let chunk-loaded bases be attacked while the server is empty.
- **Assumption, to verify in spike 004:** hostile mobs despawn when no player is within 128 blocks, and natural spawning needs a nearby player. If so, a chunk-loaded base with no player nearby gets **no** natural attackers, which is why ADR 0008 is needed.

<a id="35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content"></a>

### 3.5 External interfaces and contracts (public API `…api.*`, consumed by adapters and compat)

- **Emitter API:** `emit(level, pos, amount)`; `amount` finite and ≥ 0; server thread only.
- **Read API:** `getLocal(level, chunkX, chunkZ)`, `getPressure(server)`, `isAggressive(level, chunkX, chunkZ)`.
- **Siege registration:** siege-eligible mobs come from the config list plus the tag `pollutioncraft:siege_eligible`. Mobs from other mods, including the gap-filler, join through tag entries **shipped by compat** (ADR 0012); the mob's own mod ships nothing. **Assumption:** eligible types must be pathfinding mobs (`PathfinderMob` in Mojang mappings); others are ignored with one log warning.
- **Tags** (namespace `pollutioncraft`): `absorbers/<type>` (blocks and entity types), `siege_eligible`, `siege_immune`, `emitters/<name>`.
- **Commands** (permission level 2): `/pollution get|set|clear|step|pressure|rates`, and `/pollution tune <key> <value>` for in-memory, session-only rate overrides (never written to config).
- **Dev overlay:** an F3 debug-screen section showing local pollution, generation/spread/absorption rates, and pressure, fed by a server payload sent only to permission-level-2 players with the overlay on. A developer tool, not the player display (a Could item); the mod is required on both client and server (user decision 2026-10-22, roadmap task 030). **As built (task 030):** the server formats the lines (from the same text code as the commands) and the payload carries them, so the client only appends text. Payload layout: protocol version, body length, body; an unknown version shows `no data` and never disconnects. The network channel version is fixed and separate from the payload protocol version. The toggle is `/pollution overlay on|off`, per player, in memory, default off; `on` sends one payload at once. A payload is built only for a subscribed player who holds permission level 2 at that moment. Until task 016, `pressure` shows `0 (until task 016)` and `aggressive` shows `n/a (until task 016)`. Client classes are referenced only from one registration lambda, enforced by an ArchUnit rule and a runtime class-load check.
- **Config:** server config; every rate, interval, threshold, and cap.
- **Stability:** semver covers only `…api.*` ([ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §1). Compat declares a runtime range `[X.Y, X+1)` on core. The gap-filler does not use the API. Adapters inside core use it as if they were external.
- **Future (M5):** a removal or scrub call, for mitigation machines bridged by compat.

### 3.6 Global time source

The user asked whether Minecraft already stores a value that advances only while players are present.
- **World game time** (`Time` in `level.dat`, the value behind `/time query gametime`) advances on every server tick. **Assumption:** on 1.21.1 it keeps advancing on an empty dedicated server. Per secondary sources, vanilla's `pause-when-empty-seconds` server property was added only in **1.21.2**, so our platform doesn't have it.
- **Per-player statistic `minecraft:play_time`** only advances while that player is online. **Assumption:** this is the stat's name since 1.17. But it is per player: summing it double-counts co-op time, and taking the maximum ignores the times the top player was offline.
- **Recommendation:** our own `activeTicks` counter, incremented once per server tick while `onlinePlayers ≥ 1`. It is exact, cheap, and never decreases. **Decided** as the time input of global pressure ([ADR 0002](../decisions/0002-pollution-model-global-local/)).

### 3.7 Development and release loops

Engineering's detail: [task 001](../../plan/tasks/001-mod-scaffold-and-ci/) and [feasibility 3](../../plan/feasibility/).

| Loop | For | Steps | Pins? |
| --- | --- | --- | --- |
| **Inner** | Developers, daily | `./gradlew runClient` / `runServer`; `./gradlew runGameTestServer` (headless, same as CI); `./gradlew deployToDevInstance` copies the jar into a **separate dev Prism instance** of the pack. Its worlds are never shared with testers. | No |
| **Outer** | Testers | Tag a core release. CI publishes it (ADR 0011 tier 2). The pack pins the exact version and hash, then a pack release goes out on GitHub Releases. | Exact version and hash |

## 4. Conventions

- **Naming:** base package and Maven group `io.github.pollutioncraft` ([ADR 0013](../decisions/0013-java-package-namespace/)); `…` in package names below stands for it. Mod ids `pollutioncraft`, and later `pollutioncraft_compat` (provisional). Artifact `pollutioncraft-1.21.1`. The gap-filler gets a neutral name (**open**, §9 Q8), since it is independent of pollution. Adapter packages: `…compat.<modid>`. Tag names use `snake_case` (`siege_eligible`). Config keys use `camelCase` (`spreadFraction`, `maxEmittersPerChunk`), with a dot for a group (`siege.breakBlocks`); the key registry in [task 008](../../plan/tasks/008-server-config/) is the single source. "Local pollution" means per chunk (16×16 blocks); "global pressure" means per world.
- **Units:** pollution in PU (dimensionless `double`). **Config intervals are in ticks (20 ticks = 1 s)** and rates are per interval, with the seconds equivalent shown in each config comment.
- **Errors:**
  - Invalid config (NaN, negative, `4×spreadFraction ≥ 1`) is rejected at load; the default is kept and the key is logged.
  - Corrupt save entries are skipped and logged, never fatal.
  - Invalid `emit` amounts are dropped and logged once per source.
  - A compat adapter that throws is disabled for the session and logged; it never crashes the server. For a Mixin hook this means the handler, not the target, owns the `try`: the mixin body is one static call; any throwable except `VirtualMachineError` sets a disabled flag, clears the adapter's working set, and logs one `ERROR` line ([ADR 0016](../decisions/0016-gtm-activity-hook-shape/)).
- **Adapter rule** (from engineering; accepted in [ADR 0005](../decisions/0005-custom-mod-vs-existing-mods/); applies from day one, inside core or in compat):
  - Each integration is optional and lives in its own package (`…compat.<modid>`).
  - It is loaded only after a `ModList` presence check, and no class in it is referenced before that check.
  - Core starts, and passes all its tests, with no integration target installed.
  - Adapters import only `…api.*` from our mod (3.5), enforced by a build check.
  - Adapters with a version-sensitive target carry a version gate. The GTM gate covers the 8.0.0 snapshot line.
  - The GTM adapter (task 012) sets the pattern for the rest.
  - **Per [ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)):** no target mod on any compile classpath in any repo; a build check allowlists only internal artifacts, Minecraft modding requirements, and generic Java utilities. Each adapter's brief records the integration-ladder evidence (which rungs were tried, why each failed). Mixins only in `…compat.<modid>.mixin`, observe-only: `@Pseudo`, string `targets`, `remap = false`, `@Inject` with `require = 0` and never `cancellable`; a mixin may implement one accessor interface from its adapter package (abstract methods only, each matching a method the target already has; [ADR 0016](../decisions/0016-gtm-activity-hook-shape/)); handlers ignore client levels and de-duplicate when the hooked method also fires without a change; no `@Overwrite`, `@Redirect`, or `@Modify*`; one optional mixin config per target, applied only when its plugin finds the target in a supported version. Core has no Mixins. Reflection (`java.lang.invoke`, `Class.forName`) only in `…compat.*` adapters that documented reaching rung 4; reflection bindings are compiled code, never read from config or datapacks. Adapters may also import `…compat.common`.
- **State:** the server is authoritative. The client receives only read-only data. The alpha has no client→server packets.
- **Security:**
  - Mutating commands need permission level 2.
  - Siege never breaks blocks with hardness < 0 or blocks tagged `siege_immune`.
  - Siege ignores `mobGriefing` (user decision). `siege.breakBlocks` is the operator's off switch, and the README must say so.
  - All config values are bounded.
- **Testing:**
  - `core` has JUnit tests: diffusion, equilibrium, the anti-spam curve, aggression, and monotonic pressure.
  - Adapters have GameTests per acceptance criterion ([feasibility 5](../../plan/feasibility/#5-testability-of-the-alpha-acceptance-criteria)).
  - Compat adapters get one GameTest each, run only when the target mod is present.
  - **Per [ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)):** unit tests cover mappings, the mixin plugin's gate (fake loading-mod list), and handler logic; reflection bindings (rung 4) also get stub-class tests. Mixin injection itself is only testable with the real target, so a **with-targets GameTest job** (required on `…compat.*` changes, and nightly) copies target jars into the run's `mods/` folder from the pack's pins and fails on a zero injection count. The build itself declares no target.

## 5. Non-functional budget

Sized for 1–8 players on one server, with GTM-scale packs.

| Item | Budget | Basis |
| --- | --- | --- |
| Field simulation | ≤ 0.5 ms/tick average with 2,500 stored chunks, at a 20-tick interval | Sparse arithmetic, time-sliced |
| Siege AI and groups | ≤ 1.5 ms/tick with 30 sieging mobs | Spike 004 |
| Total mod cost | < 2 ms/tick over the bare-pack baseline | Feasibility section 4 |
| Save size | < 200 KB per dimension at 2,500 chunks | 48 B per chunk raw; 43,919 B on disk measured at 2,500 chunks (task 007) |
| Absorber sampling | ≤ 1 chunk per tick | 256 heightmap reads plus an entity query |

**Assumption:** first estimates, to be confirmed by spike 004 and the P4 performance run.

## 6. Traceability

| Requirement | Design element | Status |
| --- | --- | --- |
| M1 Emission tied to activity | 3.3 Emission: emitter engine in core, mappings in compat (`…compat.minecraft`, furnace first); Emitter API; code adapters | Furnace slice done. Alpha set (user, 2026-10-27): furnace, blast furnace, smoker, campfire, torches, lanterns, furnace minecart, then GregTech machines last. GT hook proven by spike 003 ([ADR 0016](../decisions/0016-gtm-activity-hook-shape/), accepted); 003b and the client check are open before 012. |
| M2 Spread and accumulation | 3.2; 3.3 interval step; [ADR 0003](../decisions/0003-storage-and-simulation/) | Accepted |
| M3 Absorption | 3.3 sampling; [ADR 0004](../decisions/0004-absorption-anti-spam/) | Accepted |
| M4 Hostile above threshold, break blocks | 3.3 aggression, siege, siege groups; [ADR 0006](../decisions/0006-mob-siege-rules/), [ADR 0008](../decisions/0008-siege-in-unattended-chunks/) | 0006 accepted; 0008 proposed; spike 004 |
| M5 Defense and mitigation | Read API; `persistent` pool; tiered emission | **Gap (deferred)** |
| M6 Tier gating | [ADR 0007](../decisions/0007-tech-tree-and-mod-list/) | **Gap (deferred)**; GregTech-led accepted |
| M7 Floor past the cutoff; anti-spam | `persistent` pool (`r = 0` in the alpha); gross-emission pressure; [ADR 0004](../decisions/0004-absorption-anti-spam/) | Mechanism accepted. The brief now uses the measurable floor wording (R5); **user confirmation of intent pending**. Cutoff stage and floor value open. |
| Goal 3 Readable state | Commands, debug readout, Read API | Display is a Could item |
| Goal 4 Unavoidable at high tech | Gross-emission pressure; residual fraction | Covered |
| Lose condition | Threshold floor; bounded pressure; drops on by default | Covered; tuning risk R3 |
| User rule: time frozen when the server is empty | 3.6 `activeTicks`; 3.4 gate | Covered |
| User rule: any loaded chunk can be attacked | 3.4; [ADR 0008](../decisions/0008-siege-in-unattended-chunks/) | Proposed |
| User ask: integrations (GT, AE2, …) | 3.1 compat (in core for the alpha); [ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) | Thermal and IC2 removed; substitutes open (§9 Q3) |
| User rule: no repo of ours has a build-time dependency on target mods (runtime presence only; exceptions: internal, modding requirements, generic Java utilities); GTM transitive deps not pinned | 3.3 emission sources; 4 adapter rule; [ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/) | Accepted |
| User ask: gap-filler mod | 3.1; [ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) (independent, integrated via compat) | Post-alpha; content not designed |
| Licensing | [ADR 0009](../decisions/0009-licensing/) | Accepted |
| Platform (version, loader, Java, GTM pin) | [ADR 0001](../decisions/0001-minecraft-version-and-loader/); 3.3 GTM version gate | Accepted |
| Repos and artifacts | 3.1; [ADR 0010](../decisions/0010-four-repositories/); [ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §1 | Accepted, including alpha repos (core + pack only) |
| Publishing | 3.1; [ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §4, §8 | Tiers accepted; platform releases deferred; Modrinth AI conflict open |
| Pack distribution (alpha) | 3.1; feasibility 3 | GitHub Releases only (`.mrpack` + `.zip`) |
| Dev and release loops | 3.7 | Defined (engineering) |

## 7. Risks and unknowns

| # | Risk or unknown | Cheapest spike that retires it |
| --- | --- | --- |
| R1 | Siege AI unreliable or too costly | Spike [004](../../plan/tasks/004-spike-siege-ai/) |
| R2 | No clean "GT machine is working" hook | **Largely retired by spike [003](../../plan/tasks/003-findings/):** the rung-2 hook on `RecipeLogic.setStatus` works without GTM on the compile classpath, for a steam single block and a multiblock controller ([ADR 0016](../decisions/0016-gtm-activity-hook-shape/)). Open, for 003b and a manual client check before 012: electric machines, a muffler multiblock, unload/break, client side. Muffler-only is ruled out (single blocks and primitive multiblocks have no muffler); `ActiveBlock` casing mappings remain an optional supplement. |
| R3 | Global pressure makes a new base unwinnable | `core` simulation of a scripted 20-hour curve; half a day |
| R4 | GTM 1.21.1 snapshot unstable | **Spike [006](../../plan/tasks/006-spike-gtm-1-21-readiness/) done; passed narrowly** ([findings](../../plan/tasks/006-findings/)). Remaining: #5293 (crash with other mods): the pack smoke test runs on every mod addition. #5447 (solid boilers): reproduce before steam progression is relied on. No 8.0 date: bump snapshots deliberately, with a smoke test and a world-load check. Fallback: 1.20.1 Forge ([ADR 0001](../decisions/0001-minecraft-version-and-loader/)). |
| R5 | **M7 testability.** The brief has adopted the floor wording: past the cutoff, steady-state local pollution at an emitting base ≥ `r × E / λ`, regardless of absorbers, and the floor drops when emission drops. **The user still has to confirm this keeps their intent.** | User confirmation (§9 Q6) |
| R6 | Surface sampling ignores absorbers players expect to count | P2 playtest |
| R7 | Siege groups in unattended chunks wipe bases unexpectedly, or cost too much | Spike 004 extension: one group against a forced-loaded box with no player nearby; measure MSPT and check despawn |
| R8 | ARR licences (Improved Mobs, Pollution of the Realms) | Only if adopted |
| R9 | Thermal and IC2 removed as targets (no builds) | None needed; the user picks substitutes ([ADR 0007](../decisions/0007-tech-tree-and-mod-list/)) |
| R11 | Modrinth may refuse majority-AI projects (§6, §6.2 of its rules), and CurseForge's AI policy is unchecked | Re-read both policies and ask Modrinth support before the first upload ([ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §8.2) |
| R12 | Core alone emits nothing; a pack without compat is silently inert | Pack smoke test asserts compat is present. During the alpha this holds automatically, since compat ships inside core. |
| R10 | Despawn and entity-ticking behaviour in forced chunks (section 3.4 assumptions) | Spike 004 extension, as R7 |
| R13 | Mixin hooks (and any reflection bindings) drift silently when a target renames members: no compiler help, and `require = 0` turns a miss into a no-op ([ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)) | Version gate in the mixin plugin (unverified target versions are never transformed) plus the with-targets GameTest job with injection counting (nightly and on `…compat.*` changes). **Confirmed by spike 003:** a renamed target method gives no crash and no log line, only zero events, so Mixin's logs are no detector; the with-targets job asserts at least one event from a running machine and calls every accessor-interface method. A re-signatured accessor throws `AbstractMethodError`, which the handler contains by disabling the adapter ([ADR 0016](../decisions/0016-gtm-activity-hook-shape/)). |

## 8. Implementation guidance for engineering-lead

1. **Platform (ADR 0001, accepted):** Minecraft 1.21.1, NeoForge 21.1.x (pin the pack's exact build, currently 21.1.264), Java 21, NeoForge's Gradle tooling. ~~GTM is a compile/runtime dependency at the pinned snapshot build.~~ **Per [ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)):** GTM is not a dependency of our build at all; the pack pins it. Dev runs get GTM from the dev Prism instance or a run's `mods/` folder. Artifact suffix `1.21.1`.
2. **Repo layout per ADR 0010, artifacts per ADR 0011:**
   - **Core-mod repo:** subprojects or source sets `core` (plain Java, internal), `api` (the `…api.*` contract), and `mod`, all bundled into **one** published jar, `pollutioncraft-1.21.1`.
   - The GTM adapter goes in `…compat.gtceu` inside `mod`, as an observe-only Mixin (integration-ladder rung 2, ADR 0015).
   - Build checks:
     - `core` has no Minecraft imports;
     - nothing in `mod` imports `…compat.*` except the `ModList`-guarded entry point;
     - adapters import only `…api.*`;
     - `…api.*` references none of our internal packages (API purity);
     - binary compatibility of `…api.*` against the last release.
   - Ship `LICENSE` (LGPL-3.0 plus the GPL-3.0 text, [ADR 0009](../decisions/0009-licensing/)).
   - Set up `maven-publish` to GitHub Packages for the single mod jar (snapshots from `main`, releases on tag), the API binary-compatibility check, and the tier-2 release workflow (GitHub Release, Modrinth, CurseForge) with the secrets and permissions in [ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §5.
   - **Pack repo** (exists): pins our mod by exact version and hash, like any third-party mod.
   - The compat repo is created at the split trigger, and the gap-filler repo when content starts (ADR 0010). The gap-filler builds standalone. Compat builds nightly against core snapshots (ADR 0011), plus the with-targets GameTest job; it never compiles against the gap-filler or other targets (ADR 0015).
3. **Shared interfaces first** (task 005): the `ChunkPollution` record (two pools), `PollutionField`, `DiffusionStep`, `AbsorptionModel`, `GlobalPressure` (taking `activeTicks`), `AggressionPolicy` (all in `core`), and the public `PollutionApi` (in `api`).
4. Build order: field and diffusion → storage, scheduler, `activeTicks` → emitter engine + furnace mapping in `…compat.minecraft` + debug commands (M1, M2) → other vanilla mappings → sampler and curve (M3) → aggression, siege, siege groups if ADR 0008 is accepted (M4) → GTM adapter with version gate (isolated package in core).
5. Keep GTM's `environmentalHazards = false` in the pack.
6. Platform uploads (`PUBLISH_PLATFORMS`) stay off until the user decides (ADR 0011 §8.1).

## 9. Questions for the user

**Open: the user decides.**

1. **Siege groups (ADR 0008):** may the mod spawn persistent siege groups in aggressive loaded chunks, and do they belong in the alpha? The brief recommends a minimal version in the alpha. ([ADR 0008](../decisions/0008-siege-in-unattended-chunks/))
2. **Empty server:** freeze pollution simulation and attacks when nobody is online (recommended), or let chunk-loaded bases be attacked offline? `activeTicks` already freezes. (3.4)
3. **Substitutes for Thermal and IC2** as integration targets (for example Mekanism or Immersive Engineering). ([ADR 0007](../decisions/0007-tech-tree-and-mod-list/))
4. **Land claims:** should claim mods (for example FTB Chunks) stop sieges in claimed chunks? **Open; no recommendation yet.**
   - If yes, a claim makes a base immune, which defeats M4 and goal 1.
   - If no, claims don't protect against pollution, which may surprise players on shared servers.
   - A middle option: claims block siege groups from *spawning* inside the claim, but don't stop breaking. Either way it needs a claim-mod adapter (following the adapter rule). ([ADR 0006](../decisions/0006-mob-siege-rules/))
5. **Modrinth vs majority-AI code:** we decided to disclose AI-generated code. But Modrinth's current rules (§6 and §6.2, last modified 2026-08-13) say projects that are "primarily or entirely" AI output may not be published publicly, which goes beyond disclosure. Keep Modrinth in tier 2 and ask Modrinth support before the first upload, or plan on GitHub Releases and CurseForge only? CurseForge's AI policy is unchecked. ([ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §8.2)
6. **M7 floor wording** (brief open question 4): does "absorbers cannot take an emitting base below a floor past the cutoff; emitting less lowers the floor" keep your intent? (R5)
7. **Which machines emit in the alpha** (brief open question 7): the vanilla set is decided (2026-10-27: furnace, blast furnace, smoker, campfire, torches, lanterns, furnace minecart). Soul torch and soul lantern do not emit; the minecart is built after P2. **Closed 2026-10-27:** the furnace minecart ships in the alpha (built after P2), and GregTech machines emit in the alpha, built last, only after all vanilla emitters are implemented and tested. Nothing else open here.
8. **Gap-filler name:** a neutral name replacing the provisional `pollutioncraft_content`. ([ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/))
9. **Third-party compile route** (narrowed by the one-artifact rule): third parties compile against the same full jar. Document only GitHub Packages (PAT) at first, and add the anonymous CurseMaven/Modrinth Maven routes when platform publishing starts? Recommended: yes. Only `…api.*` is under semver. ([ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/) §8.3)
10. **Later, not needed for the alpha:** the net-zero cutoff stage (proposal: HV), starting numbers (emission rates, thresholds, spread, floor value; tuned in playtests), and **platform releases** of our mods (deferred by the user; `PUBLISH_PLATFORMS` stays off, ADR 0011 §8.1).
11. **Package namespace and licence id** (task 001): confirm `io.github.pollutioncraft` (the GitHub org PollutionCraft, from the docs repo remote; [ADR 0013](../decisions/0013-java-package-namespace/)) and `LGPL-3.0-only` rather than `-or-later` ([ADR 0014](../decisions/0014-licence-spdx-id/)). Engineering proceeds with both; cheap to change until the first release.


**Resolved (2026-10-20 to 2026-10-22), for reference:**
- Version and loader: 1.21.1 NeoForge, with 1.20.1 Forge as the fallback ([ADR 0001](../decisions/0001-minecraft-version-and-loader/)).
- Global and local model: hybrid, with `activeTicks` and gross emission ([ADR 0002](../decisions/0002-pollution-model-global-local/)).
- Grid: one chunk, with a tunable spread ([ADR 0003](../decisions/0003-storage-and-simulation/)).
- Anti-spam: three layers ([ADR 0004](../decisions/0004-absorption-anti-spam/)).
- Siege rules: drops, mob list, and `mobGriefing` ignored ([ADR 0006](../decisions/0006-mob-siege-rules/)).
- Tech tree: GregTech-led ([ADR 0007](../decisions/0007-tech-tree-and-mod-list/)).
- Licences ([ADR 0009](../decisions/0009-licensing/)).
- Four repos; only core-mod and pack repos at the alpha ([ADR 0010](../decisions/0010-four-repositories/)).
- One artifact per repo, two-tier publishing, and AI disclosure ([ADR 0011](../decisions/0011-cross-repo-artifacts-and-versioning/)).
- Independent gap-filler, all emitter mappings in compat, gap-filler machines inert elsewhere ([ADR 0012](../decisions/0012-independent-gap-filler-and-compat-as-integration-layer/)).
- Furnace as the first emitter slice.
- GTM's transitive dependencies are not pinned (user, 2026-10-22; task 001 condition 3).
- Compat without build dependencies, accepted ([ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/)): the rule covers every repo, with three exceptions (internal artifacts; Minecraft modding requirements; generic Java utilities such as Apache Commons, Lombok, Jackson). CI may download the pack's pinned target jars when a job needs them. Integration ladder: data mapping → Mixin → other → reflection last.

## 10. Alignment with engineering's docs (for Heimdall)

As of 2026-10-22, [feasibility](../../plan/feasibility/), the [roadmap](../../plan/roadmap/), and tasks 001–006 and 025 reflect this design. That covers the platform, repo layout, one artifact, API purity and adapter-import checks, `activeTicks`, the 20-tick spread default, two-pool data, surface sampling, ignoring `mobGriefing`, siege targeting, all mappings in compat, the furnace-first slice, and the dev loops. Remaining items:

| # | Topic | Action |
| --- | --- | --- |
| 1 | Siege groups | Roadmap 021 waits on ADR 0008 (§9 Q1). Spike 004 adds the R7/R10 checks. |
| 2 | Empty-server gate | Tasks 007 and 016 implement the `activeTicks` freeze. Whether simulation and attacks also freeze waits on §9 Q2. |
| 3 | Pack inertness without compat (R12) | Pack smoke test should assert compat is present once it is a separate jar (after task 027). |
| 4 | Pre-upload checks | Task 026 checklist: Modrinth/CurseForge AI policy, AI-disclosure flag, no AI-generated images (R11). |
| 5 | Compat without build dependencies ([ADR 0015](../decisions/0015-compat-without-build-dependencies-on-target-mods/), accepted) | Task 001 follow-up (engineering-lead to brief now): remove GTM from `mod`'s build (compileOnly, `gtmRuntime`, GTCEu repo, `verifyGtmHash`, `gtceu_sha256`, catalog entry); add the compile-classpath, Mixin-placement/observe-only, and reflection-confinement checks; allow `…compat.common` in the adapter-import check; add the with-targets GameTest CI job. Task 001's "No Mixins in this task" stays; the first mixin config comes with 012. Tasks 003, 012, 027, 028 and the roadmap are updated. |

## Sources

- GTM repo: [GregTechCEu/GregTech-Modern](https://github.com/GregTechCEu/GregTech-Modern), [releases](https://github.com/GregTechCEu/GregTech-Modern/releases); PRs [#4760](https://github.com/GregTechCEu/GregTech-Modern/pull/4760), [#5477](https://github.com/GregTechCEu/GregTech-Modern/pull/5477); issues [#4875](https://github.com/GregTechCEu/GregTech-Modern/pull/4875), [#5160](https://github.com/GregTechCEu/GregTech-Modern/issues/5160), [#5293](https://github.com/GregTechCEu/GregTech-Modern/issues/5293), [#5414](https://github.com/GregTechCEu/GregTech-Modern/issues/5414), [#5515](https://github.com/GregTechCEu/GregTech-Modern/issues/5515). Hazard code: `common/capability/EnvironmentalHazardSavedData.java`, `config/ConfigHolder.java` (branch `1.20.1`).
- GTM on [Modrinth](https://modrinth.com/mod/gregtechceu-modern), [CurseForge](https://www.curseforge.com/minecraft/mc-mods/gregtechceu-modern/files/all); fork [GregTech Modern Reborn](https://www.curseforge.com/minecraft/mc-mods/gregtech-modern-reborn/files/7627991).
- [Thermal Expansion files](https://www.curseforge.com/minecraft/mc-mods/thermal-expansion/files/all); [IC2 Classic files](https://www.curseforge.com/minecraft/mc-mods/ic2-classic/files/all); IC2 remakes: [IC2: Nostalgia](https://www.curseforge.com/minecraft/mc-mods/industrial-craft-2-nostalgia), [IC2R](https://github.com/crococrystal/IC2R), [ic2port](https://github.com/ximaks00-hue/ic2port), [IC² forum thread](https://forum.industrial-craft.net/thread/17202-industrial-craft-2-port-to-1-20/).
- Modrinth API `/v2/project/<slug>/version` for create, mekanism, ae2, kubejs, improved-mobs, pollution-of-the-realms, modern-industrialization, immersiveengineering, create-new-age (2026-10-20).
- Factorio: [Pollution](https://wiki.factorio.com/Pollution), [Enemies](https://wiki.factorio.com/Enemies). GTNH: [Pollution](https://wiki.gtnewhorizons.com/wiki/Pollution).
- [Pollution of the Realms](https://www.curseforge.com/minecraft/mc-mods/pollution-of-the-realms); [Create: Smog](https://modrinth.com/mod/create-smog); [Improved Mobs](https://modrinth.com/mod/improved-mobs).
- Empty-server pause (secondary): [Idle Pause datapack](https://modrinth.com/datapack/idle-pause), [docker-minecraft-server autopause docs](https://docker-minecraft-server.readthedocs.io/en/latest/misc/autopause-autostop/autopause/).
- Loader ecosystem: [NeoForge 2025 retrospective](https://neoforged.net/news/2025-retrospection/), [G-Portal wiki](https://www.g-portal.com/wiki/en/?p=29481) (secondary).
