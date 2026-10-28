---
title: Roadmap
status: proposed
owner: Heimdall
---

Draft plan for the v0.1 alpha (requirements M1–M4 in the [brief](../../brief/overview/)). Design: [Architecture](../../design/architecture/) and its ADRs. Engineering background: [Engineering feasibility](../feasibility/).

**P0 is ready to start:** tasks 001 and 025 have no open blockers, and 002 follows 025. Spike 006 is done. P1–P4 tasks are tentative; each gets a brief once its blocking ADRs are accepted (for example ADR 0003 for P1). This roadmap stays `proposed` until project-owner accepts it.

Phases are named **P0–P4** so they don't collide with the requirement IDs **M1–M7**.

## Scope of the alpha build

Per [ADR 0005](../../design/decisions/0005-custom-mod-vs-existing-mods/) and [ADR 0010](../../design/decisions/0010-four-repositories/) (both accepted), the target state is three mods in four repositories:

- core `pollutioncraft`
- `pollutioncraft-compat`
- the gap-filler: an independent tech mod. Its provisional id is `pollutioncraft_content`, which needs a neutral name (open).
- the modpack

Cross-repo artifacts and versioning: [ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) (proposed).

Per [ADR 0012](../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) (accepted):

- Core and the gap-filler depend on nothing of ours.
- Compat depends on the core mod jar (importing only `…api.*`) and on each target mod (GTM, Mekanism, AE2, the gap-filler, ...), each optional. It is **the** single integration layer.
- **Release order:** core and the gap-filler (independent of each other), then compat, then the pack.

- **In (two repos, two shipped artifacts):** the core mod, with the emitters M1 needs and the GTM adapter as an isolated package, plus the pack.
- **Out:**
  - **Compat:** splits out of core when a second code adapter appears, or when GTM updates start forcing core releases.
  - **Gap-filler:** after the alpha. It is not a pollution mod and not a core dependency. It is a standalone tech mod, integrated with pollution only through compat.
  - **Other adapters** (Thermal, IC2, AE2, ...).

  See [feasibility, section 1](../feasibility/#adapters-to-other-mods-post-alpha-seam).

## Phases

| Phase | Outcome | Requirements | Blocked by | Status |
| --- | --- | --- | --- | --- |
| P0 Foundations | Version decided (ADR 0001 accepted). Mod and pack build in CI. Pack releases work. Spikes retire the top risks. | — | — | in progress (pack repo exists; 006 done) |
| P1 Pollution core | Machines emit; pollution spreads and persists; debug commands show it | M1 (blocks), M2 | ADR 0003 accepted; emitting-machine list | furnace slice code-complete (005, 007–011, 030 accepted); open: merge to `main`, the user's manual check, then 031 → 029. **P1 closes after 029.** The remaining M1 emitters are outside P1: 032 (starts now, in parallel with P2 planning) and 012 (after 032), both blocking P4 |
| P2 Absorption | Surface blocks absorb pollution, with soft caps per type (blocks only in the alpha; entities later, user decision 2026-10-28) | M3 | ADR 0004 accepted | planned |
| P3 Mob behaviour | Above the threshold, siegers break in to sources and players, in any loaded chunk. Below it, they don't. | M4 | ADR 0002 and ADR 0006 accepted (incl. the siege spawn source); spike 004 | planned |
| P4 Alpha integration | Pack ships with the mod. Smoke, performance, and playtest checks pass. | M1–M4, lose condition | P1–P3, **032 (furnace minecart) and 012 (GTM adapter)** | planned |

### Alpha emitter exit criteria (user decisions 2026-10-22 and 2026-10-27)

M1 is fully met for the alpha only when every emitter below has a passing GameTest. Order: furnace (011, done) → 031 → 029 (blast furnace, smoker, campfire, torches, lanterns) → 032 (furnace minecart; starts now, in parallel with P2 planning, since it does not depend on absorption) → 012 (GregTech machines, last; needs 003b before its design gate and 033 before its code, both of which can run in parallel with P2). The GregTech part of M1 is verified in the with-targets GameTest job (033), not in the default run, so the alpha exit also needs that job green on the pinned GTM, and from 022 the pack's smoke test asserts the "GTM hook active" log line ([ADR 0016](../../design/decisions/0016-gtm-activity-hook-shape/) decision 6). P4 (alpha integration, tasks 022 to 024) starts only after 032 and 012 as well as P1–P3. The playtests (024) cover the full set.

## Tasks

IDs for 005 and later are tentative, except 006 and 025, which are briefed. IDs are identifiers, not an order. "After" lists dependencies; tasks with no dependency between them can run in parallel.

### P0 Foundations (briefed)

| ID | Task | After | Blocked by |
| --- | --- | --- | --- |
| [006](../tasks/006-spike-gtm-1-21-readiness/) | Spike: GTM 1.21.1 NeoForge snapshot readiness. **Done**; ADR 0001 accepted. Follow-ups: the user's playthrough, and reproducing #5447 | — | — |
| [001](../tasks/001-mod-scaffold-and-ci/) | Core mod scaffold, unit-test and GameTest harness, CI (1.21.1, NeoForge, Java 21). **Done**, accepted with conditions (GTM hash to confirm against the pack; ADRs 0013 and 0014 still proposed) | — | — |
| [025](../tasks/025-pack-release-pipeline/) | Pack release pipeline. **Scaffold done** (pack v0.0.1 pinned by hash, pinned tooling, `THIRD-PARTY.md`, `release.yml` written but never run). **Not released:** the tagged `v0.0.1` release, install check, re-hosted GTM jar and release notes are deferred until core functionality works (user decision 2026-10-22); until then testing is local only | — | Release steps: user declares core functionality working |
| [002](../tasks/002-pack-scaffold-and-smoke-test/) | Pack CI on push and pull request, plus a dedicated-server smoke test. **Done**, accepted (follow-ups: `SMOKE_PORT`, shellcheck in CI, NeoForge installer hash) | 025 | — |
| 026 | Core-mod release pipeline (tentative, not yet briefed; details below) | 001 | ADR 0011 accepted (hosting already decided by the user) |
| [003](../tasks/003-spike-gregtech-activity-hook/) | Spike: detecting "GT machine is working". **Done 2026-10-27**, accepted: rung-2 Mixin hook works on the pinned snapshot ([findings](../tasks/003-findings/)). Follow-up: 003b | 001 | GT in the pack |
| [004](../tasks/004-spike-siege-ai/) | Spike: siege AI, its tick cost, despawn and spawn constraints | 001 | — |

**026 scope** ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §4–§5, two-tier publishing):

- **One artifact:** `maven-publish` of the single mod jar `pollutioncraft-1.21.1` (plus its standard sources attachment) to **GitHub Packages** ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §1). A `-SNAPSHOT` is published from every push to `main`; releases are published on tag. There is no separate API artifact.
- **API compatibility check:** a binary-compatibility diff of only the `…api.*` packages of that jar against the last release, in CI. It fails a non-MAJOR release that breaks them. **Unverified:** that the chosen tool (for example japicmp) can filter by package. Verify this first in the task.
- **Release workflow**, triggered by a `v*` tag and run in a protected `release` environment with required reviewers. It never runs on pull requests or forks. Jobs:
  1. `verify`: build, unit tests, GameTests, API check.
  2. `maven`: publish to GitHub Packages.
  3. `github-release`: create the GitHub Release with the jars attached.
  4. `modrinth` and `curseforge`, in parallel: upload with version, loader, MC version, `alpha` channel, changelog, LGPL-3.0, and declared dependencies.

  Each job can be re-run on its own, and versions are never overwritten; a broken release gets a new PATCH.
- **Platform uploads gated:** the `modrinth` and `curseforge` jobs run only when the repo variable `PUBLISH_PLATFORMS` is `true`. It defaults to `false`, so a release is GitHub Packages plus a GitHub Release only. When to flip it is **deferred** by the user ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §8.1); ideally after GTM has a numbered 1.21.1 release.
- **Checklist before the first platform upload**, done before `PUBLISH_PLATFORMS` is first set to `true` ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §8.2):
  1. Re-read Modrinth's content rules §6 (AI content). If still unclear, ask Modrinth support whether AI-assisted code with human design and review counts as "primarily AI output". The current wording likely forbids publishing majority-AI projects; if so, skip Modrinth.
  2. Check CurseForge's current terms and moderation guidelines for an AI policy. It is unchecked as of 2026-10-22.
  3. Set the AI-content disclosure flag on every platform that has one, and keep it accurate.
  4. Use no AI-generated images on project pages: icons, screenshots, or banners. Modrinth bans them.
- **Secrets, permissions, and variables (least privilege):**
  - Snapshot workflow: `GITHUB_TOKEN` with `contents: read, packages: write`.
  - Release workflow: `contents: write, packages: write`.
  - Compat CI (later): `packages: read`, plus a per-package access grant for the compat repo.
  - `MODRINTH_TOKEN` and `CURSEFORGE_TOKEN` exist **only** as `release` environment secrets.
  - Project ids are repo variables, not secrets.
- **Upload tooling:** choose a Gradle plugin or GitHub Action for each platform, and verify it is maintained.
- **Verify:** `versionRange` in mod metadata works for the chosen loader.

001 runs in parallel with 025 and 002. 026 is not needed for P1–P3 development, which uses the local inner loop ([feasibility, section 3](../feasibility/#3-pack-assembly-distribution-and-testing)); it is needed before 022. Its Maven snapshots matter only once other repos compile against the core mod jar (after the compat split, 027). 003 runs in parallel with 004. 025 comes before 002 because both touch the pack repo's CI.

The pack repo already exists (packwiz; 1.21.1 NeoForge; GTM 8.0.0 snapshot) and has an untested release workflow. Its state is recorded in task 025.

### P1 Pollution core (tentative)

**Order change, user decision 2026-10-22:** before spike 003 starts, build the debugging and first-emitter path: 005 → 007 (+008) → 010 → 009, 011 (furnace adapter), then 030. Spike 003 follows, since GTM detection is easier to judge with the pollution readout in hand. 029 and 012 stay later.

- [**005**](../tasks/005-shared-interfaces-and-diffusion/) **Done**, accepted with follow-ups (007 measures step cost; 010 resets `dominantSource`). Shared interfaces:
  - in the `…api.*` packages (bundled in the mod jar): `PollutionApi` (emit, `getLocal`, `getPressure`, `isAggressive`, per [architecture 3.5](../../design/architecture/#35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content)), referencing only Minecraft, NeoForge, and the JDK (API-purity check);
  - in `core`: `ChunkPollution`, `PollutionField`, `DiffusionStep` (implemented, with unit tests), and `AbsorptionModel`, `GlobalPressure`, `AggressionPolicy` (interfaces only).

  **Must merge before every other P1–P3 task.** After 001.
- [**007**](../tasks/007-storage-active-ticks-scheduler/) Per-dimension `SavedData` storage (with `dataVersion`), the world-level `activeTicks` counter (advances only while players are online, [architecture 3.6](../../design/architecture/#36-global-time-source)), and the time-sliced scheduler. After 005.
- [**008**](../tasks/008-server-config/) Server config with validation (architecture 4, errors). **Must expose a runtime-override layer** that 009's `/pollution tune` uses. After 005; parallel with 007.
- [**009**](../tasks/009-debug-commands/) Debug commands (permission level 2), **pulled forward by user decision 2026-10-22**, built before spike 003 starts. After 007, and extended as 010 and 011 land.
  - **Read:** `/pollution get` (local value, `persistent` pool, `dominantSource`, `emittedLastInterval` for a chunk), `/pollution pressure` (`activeTicks`, world `grossEmitted`, `pressure`), and `/pollution rates`, which shows the chunk's generation, spread in and out (totals), absorption and decay for the last interval. Per-neighbour spread is deferred (Odin, 2026-10-26).
  - **Status (2026-10-26):** 009, 009b, 010, 011 and 030 accepted with follow-ups, code on local branches, not yet merged (order: 010, 011, 009, 009b, 030). The furnace slice of M1 is demonstrated by a GameTest. P1 is code-complete for the furnace goal; it closes when the branches are merged and the user's manual check passes (see the P1 row).
  - **Write:** `/pollution set|clear` for a chunk or radius, and `/pollution step [n]` to run n simulation intervals now.
  - **Runtime tuning:** `/pollution tune <key> <value>` overrides a config rate (spread, absorption, emission multiplier) in memory for the session. It never writes the config file, is validated like 008, and `/pollution tune reset` restores the config.
  - Tests: unit tests for argument parsing and tune validation; a GameTest that sets, steps, and reads back.
- [**010**](../tasks/010-emitter-api/) Emitter API (`PollutionApi.emit` into the pending buffer, with `dominantSource` and `grossEmitted` updates). Its tests call the API directly or use a **test-only** mapping, because core ships no mappings. The real M1 GameTest comes with the first shipped mapping in 011. After 007.
- [**011**](../tasks/011-block-emitter-engine-and-furnace-mapping/) Config/datapack-driven block/tag emitter. **Core's own layer** ships only the emitter engine and the mapping format. **All mappings, vanilla included**, ship as data in the `…compat.minecraft` package inside core for the alpha ([ADR 0012](../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §2). Core alone loads but emits nothing.
  - **First slice, user decision 2026-10-22: the vanilla furnace only**, active while its `lit` block state is true. It is the only shipped mapping in this task.
  - Engine tests use a **test-only mapping in core's test resources** (a test block or tag, never shipped).
  - The M1 GameTest uses **only the furnace mapping**: a lit furnace raises pollution, and an unlit furnace adds none. It runs against the real `…compat.minecraft` data, in core's CI during the alpha.

  After 010.
- [**030**](../tasks/030-dev-pollution-overlay/) Dev pollution overlay in the F3 debug screen: the current chunk's pollution, `persistent` pool, generation/spread/absorption rates from the last interval, global pressure, and the aggressive flag. **Pulled forward** with 009 (user decision 2026-10-22). It is a developer tool, **not** the player-facing pollution display, which stays a Could item in the brief. The server pushes a small payload for the player's chunk (and neighbours) after each interval, only to players with permission level 2, and only when the overlay is enabled. The client appends lines through the debug-text event. **Decided 2026-10-22:** the core mod is required on both client and server (a payload plus a client-only class). Pack and install docs must say so. After 009. **Accepted 2026-10-26**, with the user's manual F3 check pending (see the task page).
- [**031**](../tasks/031-emitter-engine-always-active-and-cap/) Engine additions for the user's 2026-10-27 emitter scope: an **always-active** rule type (an entry without `active_when`, for light sources) and a **cap on tracked positions per chunk** (011 follow-up). Engine and config only, no shipped mapping, own design step and cost measurement. After 011. **Accepted 2026-10-27** (`maxTrackedPerChunk`, default 2,048, lowest positions win; about 58,000 to 60,000 active tracked blocks use the whole 0.5 ms/tick; no level-wide cap), code on a local branch, not yet merged. **Blocks 029.**
- [**029**](../tasks/029-remaining-vanilla-emitter-mappings/) Remaining vanilla mappings in `…compat.minecraft`, scope set by the user 2026-10-27 (rule: a block emits if it burns something): blast furnace and smoker (2.0, `lit`; they burn fuel twice as fast), campfire (0.25, `lit`), torch, wall torch and lantern (0.01, always active); rates accepted by the user as P4 placeholders. Out (user): soul campfire, soul torch, soul lantern, redstone parts and the rest of the listed non-burners; candles, jack o'lantern, lava and fire stay out unless added. Copper lantern does not exist on 1.21.1. Data only, one GameTest per mapping, activity state verified in the sources first, cost measured with torches in the hundreds. Rates are placeholders for P4. It does not trigger the compat split. After 031; parallel with 012 onwards. **Accepted 2026-10-27**, with follow-ups; code on a local branch, not yet merged. **P1 closes once 031 and 029 are merged and the user's manual check passes.**
- [**032**](../tasks/032-furnace-minecart-emitter/) Furnace minecart emitter. An entity, so it needs its own tracking path and a **design gate** (a reviewed design note before code). **No blockers** (031 and 029 are merged). **User sequencing decision 2026-10-27 (later): starts now, in parallel with P2 planning.** It uses `emit` and the 011 engine, not absorption code, so "after P2" was only a preference. **It ships in the alpha**, so it blocks P4. 012 follows it. **Accepted 2026-10-28** (0.45 PU per interval while lit, a placeholder; at most 1,024 carts per dimension), code on a local branch, not yet merged. **After it, the remaining M1 emitter is 012.**
- [**003b**](../tasks/003b-spike-gregtech-hook-electric-and-unload/) **Done 2026-10-27**, accepted ([findings](../tasks/003b-findings/)); nothing refuted ADR 0016, and the user's client check found no client-side handler call. Was: short headless follow-up spike (Sindri): an electric single-block machine, an electric multiblock with a muffler hatch, and what is observable when a working machine is unloaded or broken, including whether it re-announces after reload. Also prepares the probe build for the **user's manual client-side check** (steps are on its page). Can run any time, in parallel with P2; **must finish before 012's design gate.**
- [**033**](../tasks/033-with-targets-gametest-job/) With-targets GameTest job: CI and a local task that run GameTests with the pack's pinned target jars (hash-checked), failing if the target is not loaded. The task 001 follow-up (ADR 0015), split from 012 so it is reviewed on its own. Can run in parallel with P2/032; **must finish before 012's code.**
- **012** GTM emitter adapter: the `…compat.gtceu` package inside the `mod` subproject. It is the first piece of the integration layer that every other mod goes through. ~~It compiles as part of the mod~~ **Per [ADR 0015](../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/)):** built through the integration ladder (data mapping → Mixin → other → reflection last) with **no GTM on the compile classpath**. Expected rung: an observe-only `@Pseudo` Mixin on `RecipeLogic.setStatus` (GTM machines have no activity block state), gated by a mixin config plugin; rates as data mappings by machine id. Unit tests for the gate and handler, plus a with-targets GameTest with injection counting. The adapter-import check limits it to `…api.*` (and `…compat.common`) packages of ours, following the adapter rule in [ADR 0005](../../design/decisions/0005-custom-mod-vs-existing-mods/). Any GregTech tag or emitter data (011's format) lives in the same compat package, next to the vanilla mappings. **Acceptance:** the adapter has a GTM **version gate**. It is active only within a configured supported range (initially the pinned 8.0.0 snapshot line); outside the range it logs once and stays inactive while core keeps running. A test covers both cases ([ADR 0001](../../design/decisions/0001-minecraft-version-and-loader/)). After 032 (so after 031 and 029; it does not wait for P2), 003b (before its design gate) and 033 (before its code); also needs the user's acceptance of ADR 0016. **The version gate is an exact list of verified version strings while the pack pins a snapshot, not a range (ADR 0016 decision 6).** **In the alpha (user decision 2026-10-27), built last: only after all vanilla emitters (031, 029, 032) are implemented and tested.** Spike 003 found a workable hook (rung-2 Mixin on `RecipeLogic.setStatus`; [findings](../tasks/003-findings/), [ADR 0016](../../design/decisions/0016-gtm-activity-hook-shape/), accepted). Brief: [012](../tasks/012-gtm-activity-adapter/), with a design gate first.

### P2 Absorption (tentative)

- [**013**](../tasks/013-absorption-model/) `AbsorptionModel` soft-cap curve per type, with the `persistent` pool fixed at `r = 0`. After 005; parallel with P1 tasks after 005. **Accepted 2026-10-28**; code on a local branch, not yet merged.
- **014** `AbsorberSampler`: surface blocks via heightmap, cache, round-robin (**no entities in the alpha**, user decision 2026-10-28). After 013 and 007.
- **015** M3 GameTests and equilibrium unit tests. After 014.

### P3 Mob behaviour (tentative)

**Open question for P3 design (from the 032 design gate, 2026-10-28):** siege targets a chunk's `dominantSource` and breaks the source block (ADR 0006). A moving furnace minecart makes its rail block position the `dominantSource`, and the entry goes stale a few seconds later. Mimir decides in P3 whether entity-sourced emissions count as a dominant source. Options to weigh: accept it; or exclude entity emissions from `dominantSource` (which needs a change to the 010 buffer or `emit`, so a source flag reaches the dominant-source rule); or attribute to the chunk but not to a block target. Not blocking 032.

- **016** `GlobalPressure` (driven by `activeTicks` and gross emission) and `AggressionPolicy` implementations. After 005; parallel with P1 and P2.
- **017** Pressure tuning simulation in `core` (architecture risk R3). After 016.
- **018** Siege targeting: player, then dominant source, then gradient ascent. Core reads the `pollutioncraft:siege_eligible` tag plus the config list. The default list (zombies) stays in core config, because it is mechanism config, not an emitter mapping; **only compat adds other mods' entries**, as optional entries ([ADR 0012](../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §1). **Unverified:** whether vanilla tag files support optional entries (`"required": false`). Check this in the first compat task that adds tag entries. After 016, 007, and spike 004.
- **019** Block-breaking goal: hardness cap, `siege_immune` tag, drops configurable (on by default), **not** gated by `mobGriefing`. After 018.
- **020** Siege limits (per-source and global caps, repath cooldown, maximum distance) and M4 GameTests. After 019.
- **021** Siege spawn source for loaded chunks with no player nearby. After 020. **Blocked:** [ADR 0008](../../design/decisions/0008-siege-in-unattended-chunks/) (proposed).

### P4 Alpha integration (tentative)

- **022** Add our core mod to the pack (compat is mandatory in our pack; in the alpha it ships inside core, so this is automatic), pinned by exact version and hash from the **GitHub Release asset** (or the CurseForge file, or Modrinth if available). **Never GitHub Packages**: players' installers have no token. The alpha stays on GitHub Releases ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §6). Add it to the third-party notices and finalise the alpha mod list. Rate tuning goes in the pack's config or datapack, overriding compat's default mappings and rates; core and compat ship defaults only. Release pack `v0.1.0` through the task 025 pipeline; the release notes record our mod versions. After P1–P3, 032, 012, 025, and 026.
- **023** Performance run: bare-pack MSPT baseline vs the pack with our mod, under scripted load, against architecture section 5. After 022.
- **024** Playtest scenarios for M1–M4 and the lose condition, including an unattended chunk-loaded base. Playtests always use the full core + compat jar (in the alpha, the core mod with its in-core compat packages) inside the pack, with the pack's tuning. Core alone emits nothing, so it is never a valid playtest setup. After 022.

### Later repos (tentative, after the alpha or at a trigger)

- **027** Create the `pollutioncraft-compat` repo. **Only at the split trigger** (ADR 0005, ADR 0012): a second code adapter is needed, or GTM updates start forcing core releases. A code adapter for the gap-filler counts as a second code adapter, so starting gap-filler integration usually triggers the split. Data-only additions do not; that includes the vanilla mappings in `…compat.minecraft` and any tags or emitter mappings.
  - Move all `…compat.*` packages and their data, **including `…compat.minecraft` and the vanilla M1 GameTest**. Core keeps only its engine tests with the test-only mapping.
  - Depend on the core mod jar `pollutioncraft-1.21.1` from GitHub Packages ~~and, once it exists, the gap-filler mod jar~~. Exact compile versions, runtime ranges. **Per ADR 0015 (accepted):** no target mod (GTM, gap-filler, …) on compat's compile classpath; target jars reach the with-targets GameTest job at run time from the pack's pins.
  - **Required adapter-import check:** any reference to a `pollutioncraft` package outside `…pollutioncraft.api.*` fails the build. The compiler can't enforce this, because the whole jar is on the classpath. The check runs on every build **and** in the nightly builds against core and gap-filler snapshots.
  - CI reads packages with `GITHUB_TOKEN` (`packages: read`), after granting the compat repo access in each package's settings. Local developers use a classic PAT with `read:packages` in `~/.gradle/gradle.properties`, never committed.
  - Release with the same tier-2 workflow as 026.
  - **Third-party docs:** third parties compile against the same core mod jar, importing only `…api.*` (the only part under semver). Document GitHub Packages with a PAT from the first release. Add anonymous CurseMaven/Modrinth Maven routes when platform publishing starts; possibly CurseMaven only, if Modrinth is unavailable ([ADR 0011](../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §8.3).
  - **Revisit:** at the split, or once third-party addons appear, consider an `api` classifier jar or a separate API artifact, so the compiler enforces the contract (ADR 0011 §1).
  - Remove the packages from core in the same core release.
  - Compat CI runs **core and compat together** (core as a runtime dependency in GameTests), because the M1 and siege behaviour can only be tested with both. It runs against the pinned versions, plus nightly builds against core's latest snapshot ~~**and** the gap-filler's~~ (ADR 0015: the gap-filler is a runtime target like any other).
  - After 026.
- **028** Create the gap-filler repo (neutral name to be chosen). **Post-alpha**, when content work starts.
  - Standalone: no dependency on core or compat, and no `pollutioncraft` tags or data.
  - CI builds and tests it on its own. It uses the same publishing scheme as 026: **one artifact only**, its mod jar, with snapshots to GitHub Packages and the tier-2 release workflow for releases. ~~Compat compiles against that jar to read its activity signals.~~ **Per ADR 0015 (accepted):** compat does not compile against it; it reads the gap-filler's activity through data mappings.
  - Its machines expose observable activity signals for compat to read: **block state preferred** (so compat needs only data, ADR 0015); capability or event only where block state can't carry it.
  - After 026, whose workflow it reuses.

## Open questions blocking the plan

See [feasibility, section 6](../feasibility/#6-open-questions).
