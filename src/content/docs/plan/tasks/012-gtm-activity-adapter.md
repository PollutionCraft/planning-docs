---
title: "012: GregTech Modern activity adapter"
status: proposed
owner: Heimdall
---

**Blocked by:** 032 (user order 2026-10-27: all vanilla emitters first), [003b](../003b-spike-gregtech-hook-electric-and-unload/), [033](../033-with-targets-gametest-job/) (for code; the design gate may start once 003b is done), and the user's acceptance of [ADR 0016](../../../design/decisions/0016-gtm-activity-hook-shape/). **Scope (user, 2026-10-27): GregTech machines emit in the alpha, built last.** Spike [003](../003-spike-gregtech-activity-hook/) is accepted: the rung-2 hook works on the pinned snapshot ([findings](../003-findings/)).

## Design gate (required before any code)

A design note, reviewed by Heimdall and checked by Odin against this page, before implementation. It must settle, from the findings, 003b and ADR 0016 (not from memory):

1. **Client side.** The handler ignores client levels. Evidence from 003b's manual check, and the test that proves it.
2. **Injection point.** `RETURN` plus per-position de-duplication (ADR 0016 decision 3), unless 003b shows a machine does not re-announce after reload. If so, state the load-time pickup.
3. **Removal and unload.** The adapter-owned working set: cleared on chunk unload and level unload, revalidated at each emission interval (the block at the position must still be a block id in the mappings), per ADR 0016 decision 5. Use 003b's observed signals.
4. **Which machines emit, and at what rate.** This is the open product question; propose, do not decide silently. Cover: all recipe-running machines or a list; steam and primitive machines; electric tiers; multiblock controllers (one emission per controller, not per part); generators; the rate shape (for example a small table by voltage tier in data, with per-machine overrides); how a **muffler hatch** changes it (M5 mitigation is later, but the data format must not block it). Rates are placeholders for the P4 playtest, against the PU scale (a lit furnace is 1 PU per interval). Present the proposal to Odin for the user.
5. **Rates as data.** Where the mapping lives (the `…compat.gtceu` data folder, path convention from [011](../011-block-emitter-engine-and-furnace-mapping/)), its format (reuse 011's where it fits, since GT has no block state to test), and `emissionMultiplier` applied as for 011.
6. **Version gate.** One constant in `…compat.gtceu`: the exact verified version strings while the pack pins a snapshot (today `8.0.0-SNAPSHOT+36a6b38`); the system-property override; the bump procedure (ADR 0016 decision 6).
7. **Cost.** The handler cost at 100 working machines (spike: 0.010 to 0.016 ms/tick) plus the emission pass; state the budget and how it is measured (P4 spark run in the real pack).
8. **Does it need an API addition?** ADR 0016 says no `setActive` call for the alpha. Confirm, or return to Mimir.

If the note shows the work is larger than a small task, return to Odin with a split proposal.

## Goal

A running GregTech machine raises the pollution of its chunk once per interval, through `PollutionApi.emit`. An idle, unloaded or broken one adds none. Core runs and passes its tests without GregTech.

## Behaviour (fixed by the findings and ADR 0016; the note fills in the rest)

- **Hook:** `@Pseudo @Mixin(targets = "…RecipeLogic", remap = false)` in `…compat.gtceu.mixin`, `@Inject(require = 0)` at the chosen point, not cancellable. The mixin `implements` the interface `GtActivityView` (declared in `…compat.gtceu`, **not** in the mixin package) with abstract `isWorking()`, `getBlockPos()`, `getLevel()`. The mixin method body is **one statement**: a call to a static handler in `…compat.gtceu`.
- **Handler:** checks a disabled flag first; ignores a null or client level; ignores an off-thread call with one log line; de-duplicates per position per level (a map from packed `BlockPos` to the last working flag); updates the working set on change only. The whole body is inside `try`; a `VirtualMachineError` is rethrown, any other `Throwable` **disables the adapter for the session**, clears the working set, and logs **one** `ERROR` line with the GTM version (stack at `DEBUG`). No re-enable until restart. The handler class has no static initialiser that can fail and imports only `…api.*`, `…compat.common`, Minecraft and the JDK.
- **Status:** `WORKING` counts as working; `IDLE`, `WAITING` and `SUSPEND` do not.
- **Emission:** once per interval per working position, at the mapped rate times `emissionMultiplier`, through `PollutionApi.emit`. Server thread only. No direct field write ([write rule](../010-emitter-api/)).
- **Gate:** the mixin plugin reads the `gtceu` mod file's version from `LoadingModList` and activates only for a verified version. Absent: inactive, one `INFO` line, the suite passes. Out of the set: one `INFO` line, the mod runs.
- **Adapter rule:** imports only `…api.*` and `…compat.common` of ours; no GTM type on any compile classpath; no class in `…compat.gtceu` referenced before the `ModList` check.

## Files owned

`mod` → `…compat.gtceu` (adapter, handler, interface, gate constant, data mappings) and `…compat.gtceu.mixin`; the optional mixin config and plugin (with `…compat.common`); the ArchUnit rules for Mixins (a mixin may implement at most one interface, from its own adapter package, with no default methods); with-targets GameTests; unit tests. Nothing in core's engine.

## Conditions

- **Design gate first**, as above.
- **Red run before each test is implemented**, pasted in the report. The with-targets tests are red by design when the hook is removed.
- **With-targets GameTest job** (task 033), against the pack's pinned GTM jar:
  - **at least one** working event from a running machine. This is the only detector of a moved or renamed target;
  - a single-block and a multiblock each produce exactly one working and one idle event, at the right position;
  - `WAITING` and `SUSPEND` count as not working;
  - unload or break clears the machine, and a reloaded working machine is picked up again (or the load-time pickup from the note works);
  - every interface method (`isWorking`, `getBlockPos`, `getLevel`) is called at least once, so a changed signature fails in CI;
  - a client-level call changes nothing;
  - **the job fails if GTM is not loaded.**
- **The main GameTests stay GTM-free** and pass without GregTech; no test or main code references `…compat.gtceu` classes before the `ModList` check.
- **Handler failure test:** a unit test with a fake that throws a `LinkageError` shows the adapter disabled, the working set cleared, and one `ERROR` line.
- **M1 acceptance:** a running GregTech machine raises its chunk's pollution by the mapped rate per interval and `grossEmitted` by the same; an idle one adds none. This is the GT part of M1 (brief); the alpha emitter set is complete only when it passes.
- Cost measured and reported against the budget; the real-pack spark profile is part of P4 (023).

## Tests to write first

1. Unit: the version gate (in set, out of set, absent, the property override); de-duplication; the disabled-on-error path; the status mapping.
2. Unit: the data mapping parse (valid, missing, bad rate, unknown machine id).
3. With-targets GameTests as listed under Conditions.
4. GTM-free suite: passes with no GregTech; a log line says the adapter is inactive.
5. Architecture checks: adapter imports, Mixin rules, no target on the classpath.

## Commands

`./gradlew build runGameTestServer` (no GregTech) and the with-targets task from 033.

## Out of scope

Other mods' adapters, the muffler's mitigation effect (M5), a `setActive` API call (promote only when a second code adapter needs it), the compat repo split (027), and the real-pack performance profile (P4).
