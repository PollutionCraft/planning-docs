---
title: "ADR 0015: Compat without build-time dependencies on target mods"
status: accepted
owner: Mimir
---

- **Status:** **accepted 2026-10-22 by the user.** Proposed and revised the same day (Mimir). User decisions: the target state, the "no pin on GTM's transitive dependencies" rule, **the ordered analysis path** (data mapping → Mixin → other options → reflection last), and the scope and CI rules in [Decisions recorded](#decisions-recorded-user-2026-10-22). The rung criteria, the Mixin rules, and the GTM placement are my design, accepted with it. **It supersedes in part:**
  - [ADR 0005](../0005-custom-mod-vs-existing-mods/): the implied "a code adapter compiles against its target mod". The adapter rule gains the clauses below; the rest of 0005 is unchanged.
  - [ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/): "compat → each target mod" becomes a **runtime-only** relation, and compat no longer compiles against the gap-filler.
  - [ADR 0011](../0011-cross-repo-artifacts-and-versioning/) §§3–5: compat's compile dependency on the gap-filler jar, and its nightly build against gap-filler snapshots, are dropped. Compat still compiles against core's jar.
  - [Task 001](../../../plan/tasks/001-mod-scaffold-and-ci/)'s GTM convention (compile + dev-runtime dependency of `mod`, hash pin in `gradle.properties`).
- **Amended in part by [ADR 0016](../0016-gtm-activity-hook-shape/) (accepted 2026-10-27 by the user, after spike 003):** on rung 2, state is read through a mixin-added accessor interface instead of `@Shadow` (refused for superclass members), the handler guards against linkage errors and disables the adapter, `RETURN` hooks de-duplicate, handlers ignore the client, and the GTM gate is an exact list of verified versions while the pack pins a snapshot. Where the marked passages below differ from 0016, 0016 wins.
- **Context:** the user wants the compat layer to let other mods (GTM first, other tech mods later) emit pollution **with no compile- or build-time dependency on them**. The only requirement is at runtime: the target mod is loaded by NeoForge. Today `mod` has GTM on `compileOnly` and on the dev-run classpath, pinned by SHA-256 (`verifyGtmHash`). The user also decided **not to pin GTM's transitive dependencies** (task 001 condition 3). The first draft of this ADR put reflection second; **the user rejected that order**: reflection is the last resort.

## Decisions recorded (user, 2026-10-22)

1. **Scope: every repo of ours** (core, compat, gap-filler, pack tooling). No target tech or content mod (GTM, Mekanism, AE2, the gap-filler as seen from compat, …) is ever a build dependency of any of them. **Allowed build dependencies, the only exceptions:**
   - **Internal dependencies:** our own artifacts, e.g. the core mod jar with `…api.*` that compat compiles against ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/) §1), and subprojects inside a repo.
   - **Minecraft modding requirements:** Minecraft, NeoForge and its loader (FML), the Gradle tooling (ModDevGradle), mappings (Parchment), and libraries NeoForge itself ships, including Mixin and MixinExtras.
   - **Generic Java utilities:** general-purpose libraries such as Apache Commons, Lombok, Jackson, and test libraries (JUnit, ArchUnit). Bundling one into a mod jar still follows the licence rules ([ADR 0009](../0009-licensing/)).
2. **CI may download the pack's pinned target jars** when a job requires them (the with-targets GameTest job). That download is test input, not a build dependency: `./gradlew build` never needs it.
3. **This ADR is accepted.**

## Facts read this session (2026-10-22)

- **Our build** (`pollutioncraft` repo, commit `0bb2075`, `mod/build.gradle`): GTM `com.gregtechceu.gtceu:gtceu-1.21.1:8.0.0-20261017.095456-124` is `compileOnly` plus a `gtmRuntime` configuration added to `runClient`/`runServer`, resolved non-transitively from an exclusive `maven.gtceu.com` repo, with `verifyGtmHash` before `compileJava`. It is **already absent from `runGameTestServer`**. `neoforge.mods.toml` declares `gtceu` as `type = "optional"`, `versionRange = "*"`. No `…compat.*` package and no Mixin exist yet.
- **NeoForge 21.1.264** (its Gradle module metadata) depends on `net.fabricmc:sponge-mixin` `0.16.4+mixin.0.8.7` and `io.github.llamalad7:mixinextras-neoforge`. That Mixin jar contains `@Pseudo`, `IMixinConfigPlugin` (`shouldApplyMixin(String, String)`, `postApply(…)`), `@Mixin.targets()` / `remap()`, and `@Inject.require()` / `expect()` / `remap()`.
- **FML `loader-4.0.45`**: `ModList.isLoaded(String)`, `ModList.getModContainerById(String)`, `IModInfo.getVersion()` → Maven `ArtifactVersion`, and, usable before mods are constructed, `LoadingModList.get()`, `getModFileById(String)`, `getMods()`.
- **Pinned GTM jar** (SHA-256 `057f8e97…1011`, read with `javap`), answering the earlier open question 5:
  - **Single-block machines have no activity block state.** `MetaMachineBlock.createBlockStateDefinition` adds only the rotation property (when the machine rotates) and `GTBlockStateProperties.UPWARDS_FACING` (when extended facing is allowed). The `active` flag (`GTMachineModelProperties.IS_ACTIVE`, aliased as `IWorkable.ACTIVE_PROPERTY`) and `RecipeLogic.STATUS_PROPERTY` are **model properties**, not block-state properties. The working state is a synced block-entity field in `RecipeLogic`.
  - **Some multiblock casings do have one.** `ActiveBlock` (used by `CoilBlock`, `FusionCasingBlock`, and others) adds the block-state property `GTBlockStateProperties.ACTIVE`. `WorkableMultiblockMachine.recipeLogicStatusChanged` calls `updateActiveBlocks(boolean)` when `shouldUpdateActiveBlocks()` is true, so those casings toggle while the multiblock works. Multiblocks without such casings (for example the coke oven, built of plain bricks) don't.
  - `RecipeLogic` (extends `MachineTrait`) has `public void setStatus(RecipeLogic$Status)`, `boolean isWorking()`, `boolean isActive()`, `getStatus()`. `MachineTrait` has `BlockPos getBlockPos()` and `Level getLevel()`: plain Minecraft types.
  - `IRecipeLogicMachine` has `getRecipeLogic()` and a default `recipeLogicStatusChanged(Status, Status)`.

## Prior art

| Approach | Who does it | Borrow | Diverge, and why |
| --- | --- | --- | --- |
| `compileOnly` dependency + `ModList` guard | The common NeoForge pattern; **our current build** | The guard, the isolated package, "core runs without the target" | A build-time dependency: excluded by the user's rule |
| Config/datapack block → rate mappings | Create: Smog (MIT; [architecture 2.2](../../architecture/#22-pollution-systems)); our option D ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/) §2) | Rung 1 | Sees only `BlockState` |
| Mixin with string targets, `@Pseudo`, gated by a config plugin | SpongePowered Mixin, shipped with NeoForge; `@Mixin(targets = …)` is meant for classes not referenceable at compile time, including absent `@Pseudo` ones ([Mixin `@Mixin` docs](https://wildermyth.com/wiki/@Mixin)) | Rung 2: event-like hooks with no target class at compile time | We allow **observe-only** injections only, never behaviour changes |
| Target ships its own plugin against our API | Recipe-viewer and tooltip plugin APIs | Keep `…api.*` good enough for it | We can't make targets write it |
| NeoForge capabilities / events (energy, items, fluids) | NeoForge | Rung 3: generic signals typed by NeoForge, not the target | GTM uses its own EU energy; deltas are noisy |
| Reflection / `MethodHandle`s on string names | Runtime-scripting mods in general (**assumption**, not checked) | Rung 4 only | No compiler help, and it means polling |
| Separate compat jar compiling against the target | [ADR 0005](../0005-custom-mod-vs-existing-mods/) B/C, [ADR 0010](../0010-four-repositories/) | — | Still a build-time dependency in one of our repos: excluded (the rule covers every repo) |

## Decision

**No build of ours compiles against, resolves, or downloads a target mod.** Every new target mod goes through **the integration ladder, in this order**, and stops at the first rung that meets that rung's criteria. The analysis, with evidence for each rung tried, goes in the adapter's task brief ("integration note").

### The integration ladder

| Rung | Mechanism | Use it when **all** of these hold | Move to the next rung when **any** of these holds |
| --- | --- | --- | --- |
| **1. Data mapping** | Block id or tag → rate, active while a named `BlockState` property is true (core's emitter engine; compat ships the data) | Every emitting machine of the target exposes its working state as a `BlockState` property; the property means "consuming fuel/energy now", not just "on" (cf. task 029's campfire check); one emitting block per machine, so nothing is counted twice | The working state lives only in block-entity data or model data (check the block's `createBlockStateDefinition`, as done for GTM above); the flag means something else; using it would double count (several flagged blocks per machine) or miss machines |
| **2. Mixin** (string-targeted, observe-only) | `@Pseudo @Mixin(targets = "<target class>", remap = false)` with `@Inject` at `HEAD`/`RETURN`/`TAIL` on a state-change method; the handler reads state through `@Shadow` members (or, per [ADR 0016](../0016-gtm-activity-hook-shape/), a mixin-added accessor interface) whose signatures use only JDK, Minecraft, and NeoForge types, and pushes activity to core through `…api.*` | A stable, public (or protected) state-change method exists, ideally one called only on change; the handler needs no target type in its signature or shadows; the target's licence allows modifying its code at runtime (GTM: LGPL-3.0, same as ours, [feasibility 3](../../../plan/feasibility/)) | No injection point that satisfies the column to the left; the hook would need `@Overwrite`, `@Redirect`, `cancellable = true`, or a target type in a signature; the target's licence forbids it; the target is itself heavily transformed and conflicts are likely |
| **3. Other options** | NeoForge-typed signals: capabilities (energy/item/fluid throughput), NeoForge or vanilla events, the target's datapack/tag hooks; or the target ships an integration against our API | The signal is accurate enough for "working now" and costs within budget | No accurate signal (e.g. GTM's EU isn't a NeoForge capability) |
| **4. Reflection** (last resort) | String class/method names resolved to `MethodHandle`s once at setup, invoked at the emitter sampling interval | Rungs 1–3 failed, documented | — (if this fails too, the target can't be integrated without the user relaxing the rule) |

**Rule for all rungs:** rates are always data (rung-1 format, block id → rate), overridable by the pack. Rungs 2–4 only supply the **activity signal**. Core's API therefore gets a push-style activity call alongside `emit` (final shape: task 005/011; for example `setActive(level, pos, boolean)`, after which the engine emits each interval for that position at the mapped rate, and drops the entry when the block at `pos` no longer matches a mapping or its chunk unloads).

### How rung 2 works without a compile-time dependency

1. **Targets are strings.** `@Mixin(targets = "com.gregtechceu…RecipeLogic")` needs no target class at compile time. `@Pseudo` keeps a missing target class from failing.
2. **Signatures avoid target types.** `@Inject` handlers take only `CallbackInfo` (no target-method arguments; **assumption:** Mixin accepts a handler that omits all target arguments, verify in spike 003). `@Shadow` members are declared only with JDK/Minecraft/NeoForge types (for GTM: `boolean isWorking()`, `BlockPos getBlockPos()`, `Level getLevel()`). **Assumption:** `@Shadow` resolves `getBlockPos()`/`getLevel()`, which are declared in the superclass `MachineTrait`; if it doesn't, use the nearest equivalent declared in `RecipeLogic` itself. Spike 003 verifies both. **Result:** the first holds; the second does not (`@Shadow` is refused for `MachineTrait` members), see [ADR 0016](../0016-gtm-activity-hook-shape/).
3. **Refmap.** GTM's names are not obfuscated, and the mixin uses `remap = false`, so it needs **no refmap entries** and no Mixin annotation processor. **Assumption:** NeoForge 1.21.1 runs with Mojang names, so even Minecraft-typed shadows need no remapping ([Minescript notes on NeoForge mappings](https://minescript.net/?p=420), secondary). Verify in the follow-up build task.
4. **Optional by construction.** One mixin config per target (`pollutioncraft.compat.<modid>.mixins.json`, `"required": false`), declared in `neoforge.mods.toml` (**assumption:** via `[[mixins]]`; verify). Its `IMixinConfigPlugin.shouldApplyMixin` returns true only if `LoadingModList.get()` has the target mod **and** its version is inside the adapter's supported range. `ModList` isn't usable this early, which is why `LoadingModList` is (**assumption on timing**; verify).
5. **Never crash the player's game.** Injections use `require = 0`, so a renamed method makes the hook a no-op instead of a crash. The version gate keeps unknown target versions from being transformed at all (log once). Silent no-ops are caught by the with-targets GameTest (below), which also runs with Mixin's injection counting (`mixin.debug.countInjections`; **assumption:** the property name, verify) so a zero count fails the job.
6. **Handlers are thin.** A handler reads the shadowed state and calls one static method in the adapter's own package, which calls `…api.*`. That method is plain Java and unit-testable.

### Rung 4 (reflection), when it is reached

As in the first draft: guard, version gate, a binding manifest of names and descriptors resolved once to `MethodHandle`s at common setup, fail closed (disable and log once), no lookups on the hot path, sampling at the emitter interval. Bindings are compiled code, **never read from config or datapacks** (a data "call method by name" format would let a datapack invoke arbitrary methods).

### GTM: which rung

| Rung | Result for GTM 8.0.0 snapshot (pinned) |
| --- | --- |
| 1 | **Fails for single-block machines** (no activity block state; fact above). **Partial for multiblocks**: `ActiveBlock` casings (coils, fusion casings) toggle `active`, but a 16-coil furnace would count 16 times, and multiblocks without such casings (coke oven) are missed. Not used for GTM machines; mufflers and casings stay unmapped so nothing double counts. |
| **2** | **Expected to succeed.** Inject at `RETURN` of `RecipeLogic.setStatus(Status)` (it covers single blocks and multiblocks, since multiblock controllers own a `RecipeLogic`); shadow `isWorking()`, `getBlockPos()`, `getLevel()` (**amended by [ADR 0016](../0016-gtm-activity-hook-shape/):** accessor interface, de-duplicated, server only); push `setActive(level, pos, working)`. Push-based, so no polling of every machine. Rates: data mappings by machine block id. **To verify in spike 003:** `setStatus` runs server-side on every transition, the two assumptions in "How rung 2 works", and the cost with 100 machines. |
| 3, 4 | Not needed: spike 003 confirmed rung 2 ([ADR 0016](../0016-gtm-activity-hook-shape/)). Had it failed, rung 3 had no accurate GTM signal (EU), so rung 4 (reflection on `IRecipeLogicMachine.getRecipeLogic()` / `RecipeLogic.isWorking()`) would have followed, with polling. |

### Adapter rule: additions to [ADR 0005](../0005-custom-mod-vs-existing-mods/)

- **No target mod on any compile classpath, in any repo.** A build check in each mod repo asserts that every compile and test classpath contains only the three allowed classes (internal artifacts, Minecraft modding requirements, generic Java utilities; see Decisions recorded), via an explicit allowlist of groups. Adding a group to the allowlist is a reviewed change.
- **Ladder evidence:** each adapter's task brief records which rungs were tried and why each failed.
- **Mixins** live only in `…compat.<modid>.mixin` packages and are listed only in that target's mixin config. ArchUnit checks: `@Mixin` classes exist only there; no `@Overwrite`, `@Redirect`, `@ModifyConstant`, `@ModifyVariable`, `@ModifyArg(s)`, or MixinExtras wrapping/modifying annotations; `@Inject` never has `cancellable = true`; every `@Mixin` there has `remap = false`, string `targets`, and `@Pseudo`. Nothing outside the mixin package references mixin classes. Core itself has no Mixins.
- **Reflection** (`java.lang.invoke`, `Class.forName`) is allowed only inside `…compat.*`, and only in adapters whose brief documents reaching rung 4.
- **Shared helpers** (the mixin config plugin, the version-range check, fail-closed logging) live in `…compat.common`; the adapter-import check allows it next to `…api.*` and the adapter's own package.

### Testing without a build dependency

| Layer | What | Target jar needed? |
| --- | --- | --- |
| Unit (`./gradlew test`) | Rung 1: mappings parse and match a test block. Rung 2: the mixin config plugin's gate (mod present/absent, in/out of range) against a fake loading-mod list; the handler's static method against `…api.*` fakes. Rung 4: bindings against test-only stub classes with the target's names, including a missing member. **Mixin injection itself can't be unit-tested** without the real target. | No |
| GameTest, default (`runGameTestServer`) | Core plus vanilla mappings, no targets. Also proves the target mixin configs apply nothing and crash nothing when the target is absent. | No |
| **GameTest, with targets** (separate CI job: required on pull requests touching `…compat.*`, and nightly) | The real hook against the real jar: an active GTM machine raises pollution, an idle one adds none, an out-of-range version stays inactive, and the injection count is non-zero. | Yes, **supplied at run time**: the job copies jars into the run's `mods/` folder from the **pack's pin** (URL + hash in the pack repo's packwiz metadata; **allowed by the user**, decision 2). The job verifies each hash before use. The build declares nothing about GTM. **Assumption:** FML loads extra mods from the run directory's `mods/` folder in a ModDevGradle run; else pass the jars from a property as a runtime-only file collection. |

### Fragility when a target updates

| Rung | What breaks | How we see it | Blast |
| --- | --- | --- | --- |
| 1 | Property or block id renamed | With-targets GameTest; mapping simply stops matching | That target emits nothing; no crash |
| 2 | Method renamed or re-signatured; a shadow member removed | `require = 0`: injection no-op → injection count 0 in the nightly job. A **missing shadow** can still be an apply-time error, which is why the version gate keeps unverified target versions from being transformed at all. | Nothing emits from that target; no crash within the supported range; outside it, the mixin isn't applied |
| 4 | Member renamed | Startup self-check disables the adapter (one log line); nightly job | Same |

Any target-version bump in the pack (a new GTM snapshot) is therefore a deliberate range bump in the adapter, made only with a green with-targets job.

### What this means for task 001's setup

| Item | Now | After |
| --- | --- | --- |
| GTM `compileOnly` | Yes | **Removed** |
| `gtmRuntime` in `runClient`/`runServer` | Yes | **Removed.** Dev runs with GTM: jars in `run/<side>/mods/`, or `deployToDevInstance` (the Prism pack instance has GTM). |
| `maven.gtceu.com` repo, `libs.gtceu`, `verifyGtmHash`, `gtceu_sha256` | Yes | **Removed.** The **pack** (task 025) is the only GTM pin ([ADR 0001](../0001-minecraft-version-and-loader/), unchanged). |
| "No Mixins in this task" | Scope line of 001 | **Stays true for 001.** Mixins are allowed from the GTM adapter (task 012) on, under the rules above. The follow-up adds only the build checks; the first mixin config and plugin come with 012. |
| `runGameTestServer` | No GTM | Unchanged; plus the with-targets job |
| `gtceu` in `neoforge.mods.toml` | optional, `*` | Unchanged (runtime metadata). The version gate lives in the mixin config plugin. |
| Condition 1 (GTM hash vs pack) | Open | **Dissolves**: one pin, in the pack |
| Condition 3 (transitive GTM deps) | Open | **Resolved by the user**: not pinned |

This is a follow-up change to accepted task 001; engineering-lead briefs it now that this ADR is accepted.

## Consequences

**Benefits:**
- Our builds never break on a target's repo, coordinates, hash, or transitive dependencies; `./gradlew build` needs no GTM. One GTM pin, the pack's.
- Rung 2 is push-based: GTM machines report their own transitions, so there is no per-machine polling.
- A fixed, documented ladder keeps every future adapter consistent.

**Costs:**
- **No compiler help** on rungs 2 and 4. A renamed target member shows up only in the with-targets job, which therefore becomes mandatory.
- Mixins change target bytecode. Observe-only injections limit the effect, but a bad apply can still crash at class load; the version gate is the guard.
- Mixin injection can only be tested with the real target jar.
- The with-targets CI job reads the pack repo's metadata (a cross-repo read and download).

**Security:** observe-only mixins; reflection bindings are compiled, never data-driven.

**Performance:** rung 2 is a handler call per status change (cheap). Rung 4 samples at the emitter interval. Budget unchanged ([architecture 5](../../architecture/#5-non-functional-budget)); spike 003 measures 100 active GTM machines.

## Blast radius / reversibility

`mod/build.gradle`, `gradle.properties`, the version catalog, the README, CI (one new job), the architecture checks, tasks 003, 012, 027, 028, and ADRs 0005, 0011, 0012. No shipped code changes. Adding `compileOnly` back for one adapter is a few lines. **Cheap to reverse.**

## Revisit if

- Spike 003 refutes rung 2 for GTM (no usable injection point under the rules).
- A target ships its own integration against our API.
- Mixin conflicts with another mod in the pack show up in the smoke test.
- Fixing hooks after target updates costs more than one small change per update on average.

## Questions for the user (resolved 2026-10-22)

1. Scope: **every repo**, with the three exception classes above.
2. CI download of the pack's pinned target jars: **allowed** when a job requires it.

## Sources

- Pinned GTM jar `gtceu-1.21.1-8.0.0-SNAPSHOT` (SHA-256 `057f8e97…1011`): `MetaMachineBlock`, `ActiveBlock`, `WorkableMultiblockMachine`, `RecipeLogic`, `MachineTrait`, `IWorkable`, `IRecipeLogicMachine`, `GTMachineModelProperties`, read with `javap` on 2026-10-22.
- NeoForge `neoforge-21.1.264.module` (Mixin and MixinExtras dependencies); `sponge-mixin-0.16.4+mixin.0.8.7.jar` (`@Pseudo`, `IMixinConfigPlugin`, `@Inject`); FML `loader-4.0.45.jar` (`ModList`, `LoadingModList`, `IModInfo`).
- `pollutioncraft` repo at `0bb2075`: `mod/build.gradle`, `gradle/libs.versions.toml`, `gradle.properties`, `neoforge.mods.toml`, `ArchitectureRules.java`, `README.md`.
- [Mixin `@Mixin` annotation docs](https://wildermyth.com/wiki/@Mixin); [Minescript: working with Minecraft mappings](https://minescript.net/?p=420) (NeoForge runtime names; secondary).
