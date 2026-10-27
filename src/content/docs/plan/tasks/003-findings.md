---
title: "003 findings: GregTech machine activity hook"
status: accepted
owner: Heimdall
---

Findings for spike [003](../003-spike-gregtech-activity-hook/), run 2026-10-27 by Sindri on the throwaway branch `feature/003-spike-gregtech-hook` of the mod repo. That branch is never merged, and none of its code becomes production code. Results were reproduced by Heimdall in the same session.

The spike ran headless: probe GameTests on the GameTest server, with GTM and `spark` only in that run's `mods/` folder, never on a compile classpath. No client, no EULA and no dev instance were used.

**Outcome:** recommendation **(a), an observe-only rung-2 Mixin hook**, is accepted for task 012. It comes with three changes to the hook sketched in [architecture 3.3](../../../design/architecture/#33-key-flows); Mimir is recording two of them against [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/). Muffler-only emission is not viable. Casing emitters are only a partial supplement. Taking GregTech out of the alpha is not needed.

Open before 012 (see [Before 012](#before-012)):

- the client side, checked by the user;
- an electric single-block machine, an electric multiblock with a muffler hatch, and what is observable when a working machine is unloaded or broken: short headless spike 003b (Sindri).

## Summary

- **The hook works on the pinned build.**
  - A `@Pseudo @Mixin(targets = "com.gregtechceu.gtceu.api.machine.trait.recipe.RecipeLogic", remap = false)` injecting at `RETURN` of `setStatus(Status)` compiles with GTM on no compile classpath and applies at runtime with no refmap.
  - It fires server-side for a single-block machine and for a multiblock controller.
  - With per-position de-duplication it gives exactly one event per real working/idle transition.
- **Cost is negligible:** 99–164 ns per call, about 1,900 calls/s with 100 working machines, **0.010–0.016 ms/tick**.
- **Optional loading and the version gate work.** With GTM absent, only the gate plugin class loads. With GTM out of the configured range, there is one log line and the mod runs.
- **Limits of the test:**
  - no client;
  - steam and primitive machines only (no electric machine, no muffler multiblock);
  - the boiler's casing state was driven by reflection;
  - unload and break were not exercised.

## Environment

| Item | Value |
| --- | --- |
| GTM | `gtceu-1.21.1-8.0.0-20261017.095456-124.jar`, mod version `8.0.0-SNAPSHOT+36a6b38`. SHA-256 `057f8e97…a1011`, identical to the pack pin `mods/gtceu.pw.toml`. |
| Loader | NeoForge 21.1.264, Mixin 0.16.4 (0.8.7) |
| Other | `spark` 1.10.124 (pack pin; placed, not used for a profile) |
| Harness | Probe GameTests (`GtProbeGameTests`), `./gradlew build runGameTestServer`. `build` stays green, including `verifyNoTargetModsOnClasspath` and the architecture checks. |
| Results | With GTM: 72/72 GameTests. Without GTM: 72/72 (Heimdall's run). |

## Detection (integration ladder)

- **Rung 1 (data mapping)** was already ruled out for single blocks: `MetaMachineBlock` has no activity block state.
- **Rung 2 reached.** Rungs 3 and 4 were not needed.

| Check | Result |
| --- | --- |
| Compiles without GTM | Yes. No `build.gradle` change, no annotation processor, no refmap. |
| Applies and fires | Single block `gtceu:lp_steam_macerator` (steam and cobblestone inserted through capabilities): `working=true` at game time 581, `working=false` at 777, at its own position, out of 2,970 raw calls across parallel probes. Multiblock `gtceu:coke_oven` (3×3×3 coke oven bricks, controller mid-face, one hatch, one oak log): one working and one idle event, at the controller's position. |
| `@Shadow` of `getBlockPos()`/`getLevel()` | **Refused.** They are declared on the superclass `MachineTrait` (`InvalidMixinException … was not located in the target class`; a WARN, game still starts). `isWorking()`, declared on `RecipeLogic`, can be shadowed. |
| Working alternative | The mixin `implements` our own interface (`isWorking()`, `getBlockPos()`, `getLevel()`) and casts `this`. JVM interface dispatch resolves to the inherited methods with identical signatures. |
| Calls per transition | `RETURN` fires on **every** `setStatus` call: GTM calls `setStatus(WORKING)` each working tick (one machine: 198 calls for 2 changes). **The handler must de-duplicate.** Alternative not tried: inject at the `updateTickSubscription()` call inside `setStatus`, which only runs on a change. |
| Status values | `IDLE, WORKING, WAITING, SUSPEND`. `WAITING`/`SUSPEND` read as not working (observed). |
| Client side | From bytecode only: `setStatus` returns early when `isRemote()`, and that return is also a `RETURN`, so **the handler is also reached on the client**. It must ignore client levels. Not observed (headless). |

## Muffler-only (fallback b): not viable

`MufflerPartMachine` (javap) has `afterWorking`, `modifyRecipe` and `emitPollutionParticles`, and no status event. Single-block machines have no muffler, and the coke oven and the large bronze boiler form and run with none. Muffler-only emission would miss every single-block machine and every primitive or steam multiblock. An electric multiblock with a muffler was not run.

## Casing emitters (fallback c): partial supplement only

- `WorkableMultiblockMachine.recipeLogicStatusChanged` sets `GTBlockStateProperties.ACTIVE` on cached `ActiveBlock` casings.
  - Observed on the large bronze boiler: `bronze_firebox_casing` `active=true` after `setStatus(WORKING)`, `false` after `IDLE`/`WAITING`.
  - Driven by reflection, because fuel could not be fed through the hatches.
- `ActiveBlock` types (javap): fireboxes, coils (8), fusion casings (5), assembly-line and engine-intake casings, crushing wheels, slicing blades, electrolytic cell, heat vent.
- Plain casings and coke oven bricks have no `active` state.
- So (c) covers some multiblocks and no single blocks. It also sits in the same call path as the hook, so it is no hedge against GTM reworking it.
- Not run against 011's engine.

## Cost

100 working `lp_steam_macerator`, 400-tick window after 100 warm-up ticks, `nanoTime` in the handler.

| Run | Calls | Per call | Handler ms/tick | Wall ms/tick |
| --- | --- | --- | --- | --- |
| Sindri, hook on (3 runs) | 38,680 | 108–164 ns | 0.010–0.016 | 0.95–1.30 |
| Sindri, hook off (range faked out) | 0 | n/a | 0 | 0.665–0.758 |
| Heimdall, hook on | 38,680 | 99 ns | 0.0096 | 0.703 |

The earlier on/off wall-time gap is run-to-run variance: Heimdall's hook-on wall time falls inside the hook-off range. The handler figure is the one to use. A spark profile in the real pack is part of the P4 performance run.

## Optional loading and version gate

- **GTM absent:** `GregTech not present; GTM hook inactive`. From `…compat`, only the gate plugin (`GtceuMixinPlugin`) is loaded by the mod. The probe GameTest itself loaded one probe record class; that is test code, and the 012 note below covers it.
- **GTM present, out of range** (range faked to `[7.0,7.1)`): exactly one line, `GregTech 8.0.0-SNAPSHOT+36a6b38 is outside the supported range [7.0,7.1); GTM hook inactive`. The mod runs.
- **How the version is read:** `LoadingModList.get().getModFileById("gtceu").getMods().get(0).getVersion()`, checked with `org.apache.maven.artifact.versioning.VersionRange` (shipped with the FML loader). `8.0.0-SNAPSHOT+36a6b38` is inside `[8.0.0,9)` with no parse error. The range used was a placeholder; 012 owns the real one.

## Stability across GTM versions

**Facts** (GitHub, `GregTechCEu/GregTech-Modern`):
- `RecipeLogic` moved from `…api.machine.trait` to `…api.machine.trait.recipe` on 2026-07-06 (#4925), after several reworks in June 2026.
- Branches `1.20.1` and `1.21` now use the new path, with the same `Status` enum and `setStatus`.

**Judgement:** `setStatus`, `Status` and `isWorking` are the core of GTM's recipe state machine, but expect a breaking move every few months while a snapshot is pinned.

**Failure mode, confirmed:** with the target method renamed, the game runs with no crash and **no log line**; the hook never fires (`require = 0`). Only a test that asserts at least one event detects it.

## Recommendation for 012

(a), the rung-2 Mixin hook, built **test-first on its own branch**. The spike code is a reference, never a source. 012 must contain:

- **A design gate (step 0)** before code, covering:
  - client-side handling (the handler ignores client levels), with the evidence from [Before 012](#before-012);
  - the injection point: `RETURN` plus de-duplication, or the `updateTickSubscription()` call. Per-position de-duplication is needed either way;
  - the **version-range policy**: where the range lives, its value for the `8.0.0-SNAPSHOT` line, and the bump procedure when the pack's GTM pin moves;
  - the removal mechanism (below).
- **The hook:**
  - `@Pseudo`, string target, `remap = false`, `@Inject(require = 0)`, not cancellable;
  - our interface cast for position and level;
  - per-position de-duplication;
  - server only;
  - the handler wrapped in `try/catch (Throwable)`, so that a GTM signature change (`AbstractMethodError` or another `LinkageError`) disables the adapter for the session with one log line and never crashes the server (architecture 4, adapter rule).
- **Removal:** the hook gives no event when a working machine's chunk unloads or its block is broken. Working machines are cleared on unload and re-validated once per interval, so nothing emits for a machine that is gone.
- **Emission** through `…api` only (`PollutionApi.emit`, once per interval per working machine), with rates in data and `emissionMultiplier` applied as for [011](../011-block-emitter-engine-and-furnace-mapping/).
- **A with-targets GameTest job** (ADR 0015):
  - GTM from the pack pin, hash-checked;
  - asserts **at least one** working event from a running machine. This is the only detector of a moved target;
  - a single block and a multiblock each produce exactly one working and one idle event;
  - `WAITING`/`SUSPEND` count as not working;
  - unload or break clears the machine;
  - the job **fails if GTM is not loaded**. The spike's probes pass silently without GTM, which would hide a missing jar.
- **The main GameTests stay GTM-free**, and no test or main code references `…compat.gtceu` classes before a `ModList` check.
- **Paths without GTM:** absent gives inactive, and the suite passes; out of range gives one log line, and the mod runs.

## Before 012

1. **Client side (the user).** In the Prism dev instance, with a probe build that logs every handler call together with its side, run a GregTech machine on and off. Client-side handler calls may appear: the `isRemote()` early return is also a `RETURN`, so the handler can be reached on the client. The check passes if every client-side call returns before touching state: no de-duplication entry, no change to the working set, and no `emit` ([ADR 0016](../../design/decisions/0016-gtm-activity-hook-shape/) rule 4). The probe's log records the side and whether the call got past the client check. This needs a real client, so it can't be automated. Sindri writes the exact steps; the user runs them.
2. **Spike 003b (Sindri, headless, throwaway, same rules as 003):**
   - **An electric single-block machine**, powered headless (spike 006 used `gtceu:creative_energy` at 32 V for an LV electric furnace), gives exactly one working and one idle event.
   - **An electric multiblock with a muffler hatch** gives the same hook behaviour at its controller.
   - **Chunk unload and block break of a working machine:** confirm that no hook event fires, and record what is observable instead (for example block-entity removal or chunk unload), so 012 can choose its clearing mechanism.

## Residual risks

1. **Snapshot churn.** `RecipeLogic` may move again. A move is silent at runtime; only the with-targets job's "at least one event" assertion catches it.
2. **Signature drift on the interface methods.** That would throw a linkage error inside GTM's `setStatus`; 012's guard turns it into "adapter disabled, one log line".
3. **Untested shapes.** Electric machines, muffler multiblocks and the client were not exercised (003b and the user's check).
4. **Casing fallback (c)** breaks together with the hook if GTM reworks `recipeLogicStatusChanged`.
5. **Dev environment only.** Nothing ran in the real pack; the P4 performance run covers that.
