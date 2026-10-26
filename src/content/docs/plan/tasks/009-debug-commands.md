---
title: "009: Debug commands"
status: proposed
owner: Heimdall
---

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
| `/pollution rates [chunk]` | Last interval for the chunk: generated, spread in and out (per neighbour), absorbed, decayed. Also the effective values of the rates in force. |
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
