---
title: Engineering feasibility (alpha)
status: proposed
owner: Heimdall
---

Engineering view of what the v0.1 alpha (M1–M4, see [brief](../../brief/overview/)) takes to build, test, and ship. The design itself is in [Architecture](../../design/architecture/) and its ADRs. Where they overlap, the design wins, and this page only adds engineering concerns.

Labels follow the brief: **Fact** (verified in this repo's docs or stated by the user), **Assumption** (to verify, usually in a named spike), **Recommendation** (engineering proposal; product-architect or the user decides).

## 1. Custom code the alpha needs

**Fact ([ADR 0005](../../design/decisions/0005-custom-mod-vs-existing-mods/) and [ADR 0010](../../design/decisions/0010-four-repositories/), accepted):** we build our own mods, each in its own repository, next to the pack repo. The repo layout is resolved by ADR 0010. The core-mod repo holds `core` (plain Java), `api` (the `…api.*` packages), and `mod`, all bundled into **one published jar**, `pollutioncraft-1.21.1` ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §1, decided). Other repos compile against the core mod jar, importing only `…api.*`; build checks enforce that.

- **Target state is three mods** ([ADR 0012](../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/), accepted):
  - **core** `pollutioncraft`: the pollution mechanics. It depends on nothing of ours.
  - **compat** `pollutioncraft_compat`: **the single integration layer**. Every other mod, including the gap-filler, reaches pollution only through compat. It depends on the core mod jar (importing only `…api.*`) and on each target mod, each optional.
  - **gap-filler**: an **independent tech mod** (new mobs and missing tech pieces). It has **no dependency on core** and is **not a pollution mod**; it is integrated through compat like any other mod. Its provisional id `pollutioncraft_content` needs a neutral name (open). **Fact (user, accepted):** its pollution-related machines (for example a scrubber or meter) do nothing pollution-related in packs without core and compat.
- **The alpha ships two artifacts:** the core mod, with the GTM adapter inside it as the isolated package `…compat.gtceu` (importing only `…api.*` of ours), and the pack. Compat splits out of core when a second code adapter appears (a gap-filler code adapter counts), or when GTM updates start forcing core releases. Compat is mandatory in our pack, since without it nothing emits; in the alpha that is automatic. Playtests always use core and compat together. The gap-filler comes after the alpha.
- Own siege behaviour. No reused mob-AI mod.

Engineering view per subsystem, mapped to [architecture 3.1](../../design/architecture/#31-components):

| Subsystem | Requirement | Engineering note | Difficulty |
| --- | --- | --- | --- |
| `core` (plain Java) | M1–M4 | Pure formulas. Fully unit-testable. A build check enforces "no Minecraft imports". | Low |
| Storage + scheduler | M2 | Sparse per-dimension `SavedData`. Time-sliced step with a per-tick budget. | Low |
| Emitters | M1 | Core provides the emitter engine and mapping format only; core alone emits nothing. All mappings, vanilla included, live in compat (vanilla in `…compat.minecraft`, inside core for the alpha). The first slice maps only the vanilla furnace (`lit`); that alone covers M1 without GregTech. Other vanilla blocks follow (task 029). Pack-specific rates are pack config or datapack overrides. GTM hook unverified (spike [003](../tasks/003-spike-gregtech-activity-hook/)). | Low (vanilla), Medium (GTM) |
| Absorber sampler | M3 | Surface sampling per [ADR 0004](../../design/decisions/0004-absorption-anti-spam/). Bounded cost: one chunk per tick. | Medium |
| Siege AI | M4 | **The main technical risk.** See below and spike [004](../tasks/004-spike-siege-ai/). | High |
| Debug commands, config | Testing | `/pollution get\|set\|clear\|step\|pressure\|rates\|tune`, plus an F3 dev overlay; every number configurable. | Low |

### Adapters to other mods (post-alpha seam)

**Accepted rule** ([ADR 0005](../../design/decisions/0005-custom-mod-vs-existing-mods/)):

- Each adapter lives in its own `…compat.<modid>` package.
- It loads only after a `ModList` presence check, with no class referenced before that check.
- It uses the public API only.
- Core starts and passes its tests with no target mod installed. Started alone, core loads but **emits nothing**: it ships no emitter mappings, not even vanilla ones. Those are in `…compat.minecraft` ([ADR 0012](../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §2).

Engineering enforces this with a build check (task [001](../tasks/001-mod-scaffold-and-ci/)): nothing in the core mod imports `…compat.*` except the `ModList`-guarded entry point. With the rule in place, splitting out compat is a copy into the compat repo plus a dependency on the core mod jar, importing only `…api.*` (task 027). **Revisit trigger** (ADR 0011 §1): when compat splits out or third-party addons appear, consider an `api` classifier jar or separate artifact.

Per ADR 0005, Thermal has only a 2024 1.20.1 build and IC2 has no official build for either target. Their adapters are blocked until substitutes are picked ([ADR 0007](../../design/decisions/0007-tech-tree-and-mod-list/)).

### Siege: why it is the hard part

- Vanilla pathfinding treats solid blocks as impassable, so a walled base yields no path. Siege must path to the nearest reachable point, break the blocking block over time, and repath.
- Every repath is an A* search. Hard limits are needed (per-source and global caps, repath cooldown, maximum distance), as in [ADR 0006](../../design/decisions/0006-mob-siege-rules/).
- **Fact (user):** `mobGriefing=false` does **not** stop siege breaking. Our break code must not route through the vanilla or Forge mob-griefing check. **Open:** land-claim mods (for example FTB Chunks) protect blocks by cancelling break and griefing events. Should claims stop sieges? If they do, a claim becomes a free, total defense (section 6).
- **Fact (user):** any loaded chunk can be attacked, whether loaded by a player or by a chunk loader. **Design gap, now proposed as [ADR 0008](../../design/decisions/0008-siege-in-unattended-chunks/).** In vanilla, hostile mobs spawn only near players and despawn almost immediately when no player is within 128 blocks (from engineering's knowledge; spike 004 verifies this). So a chunk-loaded base with no player nearby has no mobs to attack it. Honouring the user's decision needs a siege spawn source (spawning siege mobs in aggressive loaded chunks) and keeping siegers from despawning. That brings part of the deferred "waves" idea into the alpha.

## 2. Version and loader

**Decided: [ADR 0001](../../design/decisions/0001-minecraft-version-and-loader/) is accepted.**

| Item | Value |
| --- | --- |
| Minecraft | 1.21.1 |
| Loader | NeoForge 21.1.x, pinned to 21.1.264 |
| Java | 21 |
| Build tooling | NeoForge's Gradle tooling (ModDevGradle) |
| GTM | `8.0.0-SNAPSHOT+20261017-095459-36a6b38`, pinned by build and hash, re-hosted by the pack |
| Artifact suffix | `1.21.1` |

- The GTM adapter has a version gate: it is inactive outside the supported range and logs once.
- Spike [006](../tasks/006-spike-gtm-1-21-readiness/) is done ([findings](../tasks/006-findings/)).
- Accepted risks: the #5293 startup crash with other mods, the #5447 solid-boiler bug, and snapshot churn. The pack smoke test (task 002) plus a world-load check on every pin bump (task 025) are the guards.

**Fallback, not the plan:** 1.20.1 Forge (GTM 7.5.x) is the rejected option. ADR 0001 names three triggers for falling back to it:

1. #5293-class startup crashes block the pack's mod list.
2. The #5447 solid-boiler bug blocks early progression with no workaround.
3. Snapshot updates repeatedly break worlds.

Falling back is cheap before P1 adapter code exists; `core` is unaffected.

## 3. Pack assembly, distribution, and testing

- **Fact (user):** the pack is built with **packwiz** in its own repo (`pollution-craft`). It already exists: MC 1.21.1, NeoForge, GTM 8.0.0 snapshot, EMI, spark. Its NeoForge and GTM pins are the decided ones (ADR 0001).
- **Fact (user): alpha distribution is GitHub Releases only.** Each release carries a `.mrpack` and a CurseForge `.zip` for testers. No Modrinth or CurseForge publishing in the alpha; revisit once GTM has a numbered 1.21 release. Reasons:
  - Modrinth requires external files bundled in the `.mrpack`, with licence proof.
  - CurseForge rejects non-approved, non-CurseForge mods in public packs.
  - The `.zip` bundles GTM, so it is for private testing only.
- **Licensing ([ADR 0009](../../design/decisions/0009-licensing/), accepted):**
  - **Our mods** (core, compat, gap-filler) are **LGPL-3.0**. **The pack repo** (metadata, configs, workflows) is **MIT**; its `LICENSE` and README note are already in place.
  - Rationale: separate jars that only call GTM's public API remain independent works. Any code copied from GTM, or applied to it via Mixin, must be LGPL-3.0. Using LGPL-3.0 for our mods removes that question.
  - Each mod repo gets an LGPL-3.0 `LICENSE` when it is created (task [001](../tasks/001-mod-scaffold-and-ci/)).
  - **Fact (user):** GTM is LGPL-3.0, so the unmodified jar may be redistributed, keeping the notice and offering the source.
  - Every bundled mod's licence is listed in `THIRD-PARTY.md` (task [025](../tasks/025-pack-release-pipeline/)).
- **Review finding:** the pack downloads GTM from GTM's *rolling* `latest-1.21` release URL. Released `.mrpack` files will stop installing once that snapshot asset is replaced. Task 025 re-hosts the pinned jar on our own release.
- **Pack CI** (task [002](../tasks/002-pack-scaffold-and-smoke-test/)): install the server side headless, boot a dedicated server, and assert it reaches `Done (` without crash reports. This runs on every push and pull request, not only on release tags.
- **Two loops for testing our mod in the pack:**

  | Loop | For | Steps | Pins? |
  | --- | --- | --- | --- |
  | **Inner (daily)** | Developers | Build the jar locally, then copy it into a dedicated dev Prism instance (the imported pack) with `./gradlew deployToDevInstance` (task [001](../tasks/001-mod-scaffold-and-ci/#dev-loop-inner-loop)) | No pin and no hash; the pack repo is not involved |
  | **Outer (releases)** | Alpha testers | Tag a core release → CI publishes to GitHub Packages and a GitHub Release, plus Modrinth and CurseForge once enabled (task 026) → the pack pins exact version and hash from the Release asset or platform, never GitHub Packages (task 022) → pack release | Exact version and hash |

  - **Convention:** the dev Prism instance has its own worlds and servers, separate from testers' builds and never shared with them.
  - Task 026 is not needed for P1–P3 development, only before 022.
  - Maven snapshots (GitHub Packages) matter only to other repos compiling against the core mod jar, meaning after compat splits out (task 027).
- **Performance baseline:** MSPT of the bare pack (`spark`) before adding our mod. Then with the mod under scripted load, against the budget in [architecture section 5](../../design/architecture/#5-non-functional-budget).

## 4. Performance risks

All of these are covered by the design's budget (architecture section 5). Engineering adds how each one is checked:

| Risk | Check |
| --- | --- |
| Field simulation over many stored chunks | Unit benchmark: step 2,500 chunks in `core` (JMH or a timed test). Budget: 0.5 ms/tick average. |
| Absorber sampling | GameTest-level timing; at most one chunk sampled per tick |
| Siege pathfinding | Spike 004 MSPT at 10, 30, and 60 siegers. Budget: 1.5 ms/tick at 30. |
| Siege spawns in unattended loaded chunks (section 1 gap) | Cap per chunk and globally; in P4 perf run |
| GT pack baseline | P4 perf run vs bare pack |

## 5. Testability of the alpha acceptance criteria

| Criterion | Automated | Manual |
| --- | --- | --- |
| M1 | GameTest, furnace mapping only (first slice): lit furnace with fuel and input raises chunk pollution after N ticks; unfuelled furnace adds none. Later, one GameTest per extra vanilla mapping (029), one for the furnace minecart (032), and one for a GT machine (012; GT emits in the alpha, user decision 2026-10-27). | — |
| M2 | Unit: diffusion with no absorption spreads to neighbours and the total rises (determinism contract, architecture 3.3). GameTest: seeded source, neighbour chunk > 0 after N intervals. | Debug commands in a test world |
| M3 | Unit: equilibrium with absorbers < without. GameTest: identical sources, one area with surface leaves and animals, compare after N intervals. | — |
| M4 | GameTest: zombie outside a sealed box with an emitter, local pollution set above the threshold: a block breaks within T ticks, also with `mobGriefing=false`. Below the threshold: no block breaks. | Scripted playtests, including an unattended chunk-loaded base. Mob AI is nondeterministic, so GameTests use generous timeouts and are checked for flakiness. |

Thresholds come from config, so tests run before numbers are tuned.

## 6. Open questions

| Question | Owner | Blocks |
| --- | --- | --- |
| Which machines emit in the alpha? **Partly answered (user, 2026-10-22):** the first slice is the vanilla furnace only, and other vanilla blocks follow (029). **Vanilla set decided 2026-10-27** (tasks 031, 029, 032). **Closed 2026-10-27:** the furnace minecart (032, built after P2) and GTM machines (012, built last, after all vanilla emitters) are both in the alpha. | User + product-architect | 012, 032 |
| Do land-claim mods protect blocks from sieges? | User | 019 |
| Siege spawn source for unattended loaded chunks ([ADR 0008](../../design/decisions/0008-siege-in-unattended-chunks/), proposed) | User | 021 |
| Alpha platform releases of our mods (CurseForge/Modrinth): **deferred** by the user ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §8.1). Until decided, `PUBLISH_PLATFORMS=false` and releases are GitHub Packages plus GitHub Releases only. | User | 026 platform jobs |
| Modrinth vs majority-AI code: the user decided to disclose, but Modrinth's rules (§6, §6.2) likely forbid publishing primarily-AI projects at all. **Open**: re-check, then ask Modrinth support ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §8.2). | User | Modrinth upload; pack's Modrinth pin option |
| CurseForge AI policy: **unchecked** (nothing found 2026-10-22). Check before the first upload. | Engineering (026 checklist) | CurseForge upload |
| Third-party compile route (narrowed, [ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §8.3): everyone compiles against the core mod jar, importing only `…api.*`. **Open:** where it is officially available from. Recommended: document GitHub Packages (PAT) from the first release, and add anonymous CurseMaven/Modrinth Maven when platform publishing starts. | User | 026/027 docs |
| Neutral name for the gap-filler mod (replacing `pollutioncraft_content`) | User | 028 |
| Substitutes for Thermal and IC2 adapters ([ADR 0007](../../design/decisions/0007-tech-tree-and-mod-list/)) | User | Post-alpha adapters |
