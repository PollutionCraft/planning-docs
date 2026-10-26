---
title: "009: Debug commands"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-26): accept with follow-ups

Branch `feature/009-debug-commands`, commit `09c7e1e`, not yet pushed or merged. Judged from Heimdall's review and Sindri's report (both read); I did not rerun the build or read the diff myself. Reported results: 29 GameTests on its own, 37 combined with 010 (`clean build runGameTestServer` exit 0), core 35 and mod 115 unit tests.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Every subcommand present, permission level 2 | Pass | GameTest `aPermissionLevelZeroSourceCannotRunAnySubcommand` (10 forms); removing `.requires` fails it |
| `set`/`clear` follow the write rule; `step` goes through `stepNow` | Pass | `setMidIntervalIsNotOverwrittenByTheAbandonedInterval` (mutant fails) |
| `set` bounds: NaN, negative, above max rejected; field unchanged | Pass | `boundsAreRefusedWithoutChangingTheField`, `CommandLimitsTest` |
| `step` bounded 1 to 1000 | Pass | `CommandLimitsTest` |
| `tune` validated like 008, in memory only, config file untouched, `(overridden)` marker | Pass | `TuneCommandTest` (8), `tuneLeavesTheConfigFileByteIdenticalAndResetRestoresTheValue` |
| `tune` keys come from the registry, no second list | Pass | `ConfigRegistry.KEYS` only (review pass 1) |
| `set`, `clear`, `step` bypass the player gate and say so | Pass | review pass 1 |
| GameTest: set, step 1, get shows spread; clear empties | Pass | `setStepGetShowsSpreadAndClearEmptiesTheSquare` |
| `get`/`rates` show `dominantSource` correctly, including negative y | Pass | `dominantSourceIsDecodedLikeBlockPosIncludingNegativeY` |
| Paused records refused and shown | Pass | `pausedDimensionIsRefusedAndShownEverywhere`, `pausedWorldRecordIsRefusedAndShown` |
| `rates`: spread in and out **per neighbour** | **Not met, deferred** | `rates` shows totals only; per-neighbour needs a `ChunkIntervalStats` change |

**Scope decision (Odin):** per-neighbour spread in `rates` is cut from this task and from the alpha. Totals are enough to show M2 and to tune. The `rates` row above is amended to match. Revisit if tuning cannot be done from totals.

**Deviations, accepted:** `RatesText` reads effective config values by reflection on the accessor-name convention (`ConfigRegistryTest` enforces it). Removed in follow-up 2. `pressure` reads 0 until task 016 implements `GlobalPressure`; that is expected, not a defect. Red-first was only partly followed (unit tests yes, GameTests mutation-checked afterwards).

**Follow-ups (Sindri, after 010 is on `main`; owns `ServerConfig` for these only):**
1. `pending: <PU>` line in `get`, from `DimensionPollution.pendingEmission(long)`.
2. Public `ServerConfig.value(ConfigKey)`; remove the reflection in `RatesText`.
3. **Done as 009b (2026-10-26, commit `67cf267`, accepted by Heimdall; judged from his review and Sindri's report):** items 1 and 2 above are delivered. `get` shows `pending: <PU>` after `emittedLastInterval`; `ServerConfig.value(ConfigKey)` replaced the reflection (no `java.lang.reflect` left in `mod/src/main`). 38 of 38 GameTests on its own, 53 of 53 merged with 011. Red lines shown, mutants fail the new tests.
4. Note: `/pollution step` does not run the block emitter engine (011). The user's manual check as an op on a real server (`/pollution pressure`, `get`, `set 20`, `step`, `tune`). Not a merge blocker. The GameTests already run every subcommand through the real dispatcher.

**Blocked by:** 007 (storage, `activeTicks`, scheduler) and 008 (config, which must expose a runtime-override layer, see below). **Pulled forward** by user decision 2026-10-22: built before spike [003](../003-spike-gregtech-activity-hook/). It is extended as 010 and 011 land; the commands work from the first merge, against whatever data exists.

**Binding rule (user, 2026-10-22, from [007](../007-storage-active-ticks-scheduler/)):** an interval snapshots the field on its first tick and writes on its last, so any field write in between would be lost. Every command that changes the field must go through `stepNow` or `abandon()`, or be queued until the interval ends.

## Goal

Let a developer see and change pollution generation, spread and absorption in a running world without editing files.

## Design references

- [Architecture 3.5 commands](../../../design/architecture/#35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content), [4 security](../../../design/architecture/#4-conventions)
- Task [005](../005-shared-interfaces-and-diffusion/): `ChunkIntervalStats`

## Behaviour

All commands need permission level 2. Chunk argument defaults to the executor's chunk.

| Command | Effect |
| --- | --- |
| `/pollution get [chunk]` | `absorbable`, `persistent`, `dominantSource` and rate, `emittedLastInterval` |
| `/pollution rates [chunk]` | Last interval for the chunk: generated, spread in and out (totals), absorbed, decayed. Also the effective values of the rates in force. Per-neighbour breakdown is deferred (see the acceptance note). |
| `/pollution pressure` | `activeTicks`, `grossEmitted`, `pressure` |
| `/pollution set <amount> [chunk] [radius]` | Sets `absorbable`. Rejects NaN, negative, and amounts above a bounded maximum |
| `/pollution clear [chunk] [radius]` | Removes both pools |
| `/pollution step [n]` | Runs n intervals now (bounded, for example 1–1000), through the same code path as the scheduler |
| `/pollution tune <key> <value>` | In-memory override of a config rate (`spreadFraction`, `spreadThreshold`, `persistentDecay`, an emission multiplier, absorption rate). Validated exactly as 008 validates config. **Never writes the config file.** |
| `/pollution tune` / `/pollution tune reset [key]` | Lists active overrides / clears them |

- Overrides last until reset or server restart. Every response that uses an overridden value marks it `(overridden)`.
- `set`, `clear` and `step` bypass the "≥ 1 player online" gate (they are explicit developer actions) and say so in their reply.
- `tune` keys are the config keys; adding a config key adds a tunable automatically (single source of truth, no second list).

## Files owned

- `mod`: command registration and handlers; a small `RuntimeOverrides` layer consulted by the config accessors. **Task 008 must provide the hook**; if 008 has merged without it, this task adds it there.
- Update the [roadmap](../../roadmap/) entry if scope shifts.

## Tests to write first

1. Unit: argument parsing and bounds for each command; `tune` rejects what config validation rejects (including `4 × spreadFraction ≥ 1`).
2. Unit: override precedence and reset; config file untouched.
3. GameTest: `set` a chunk, `step 1`, then `get` shows spread into a neighbour; `clear` empties it.
4. GameTest: a non-operator cannot run any subcommand.

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

The F3 overlay (030), a player-facing display, persisting tuned values (to keep one, edit config or the pack's datapack).
