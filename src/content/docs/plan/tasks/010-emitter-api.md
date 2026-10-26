---
title: "010: Emitter API and pending buffer"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-26): accept with follow-ups

Branch `feature/010-emitter-api`, commit `3e35653`, not yet pushed or merged. Judged from Heimdall's review and Brokkr's report (both read); I did not rerun the build or read the diff myself. Reported results: 28 GameTests, core 58 and mod 104 unit tests, all passing, and 0.082 to 0.118 ms/tick for drain plus step with 100 emitting chunks (budget 0.5).

| Criterion | Result | Evidence |
| --- | --- | --- |
| `emit` is server-thread only, rejected off-thread with no state change | Pass | GameTest `anOffThreadCallIsRejectedAndChangesNothing`; Heimdall's mutant fails it |
| Invalid amounts dropped, logged once per source; 0 is silent | Pass | `EmissionBufferTest` |
| `emit` never writes the field (write rule, 2026-10-22) | Pass | review pass 1: field changes only in `DiffusionJob.apply` |
| `isPreserved()` refuses writes | Pass | GameTest `emitIntoAPausedDimension…`; nothing buffered |
| Dropped interval re-queues; stats and `grossEmitted` change only on commit (2026-10-26) | Pass | `abandoningAfterTheDrainRequeuesAndCountsOnce`; unit mutants fail; every drop path covered (`abandon`, finish failure, `stepNow` failure, `startJob` failure) |
| Dominant source, lowest packed position on ties; no emission clears it | Pass | `tiesGoToTheLowestPackedPosition…` |
| `grossEmitted` monotonic, counted once | Pass | GameTests, mutant M2 |
| Restart semantics documented by test | Pass | `pendingAndUncommittedEmissionsAreLost…` |
| API purity | Pass | architecture checks inside the 104 |
| Buffer bounded | Pass | `maxEmittersPerChunk`, cap rule in `EmissionBuffer` |

**Deviations, accepted:**
- Config key `maxEmittersPerChunk` (now named above). It is camelCase, which matches every other key; see the architecture §4 fix of this date.
- `mod/build.gradle`: `runGameTestServer` now deletes `run/gametest/world`. Outside the brief's file list but needed: stale local worlds made 007's spread test fail on the second run. CI was never affected.
- One added line in 007's `PollutionSimulationGameTests.clearAround` (`abandon()` before seeding), enforcing the write rule.
- Red-first was not followed (tests were mutation-checked afterwards). Process failure, not an acceptance failure. **From 011, a red run per test before implementing is required.**

**Follow-ups:**
1. **PU upper bound / overflow** (Mimir): every emitted amount is finite, but sums can overflow to infinity near `Double.MAX_VALUE`. The server does not crash (`tickDimension` catches it), but the field would hold infinity. Needs a design decision (per-call bound or saturating sums) and an API contract line. Not alpha-blocking; no legitimate source comes close.
2. **`emit` cost in 011:** `PollutionManager.dimension(level)` and `world(server)` rebuild a data-file path on each call. 011 must measure `emit` inside its 100-emitter budget and cache the lookup if it shows.
3. **Merge:** 010 merges before 009. Neither is pushed yet.

**Blocked by:** 007 (storage, scheduler, `grossEmitted`).

**Binding rule (user, 2026-10-22, from [007](../007-storage-active-ticks-scheduler/)):** an interval snapshots the field on its first tick and writes on its last, so any field write in between would be lost. Field writes must go through `stepNow` or `abandon()`, or be queued until the interval ends. The emit buffer is queued. `emit` must not write the field directly.

**Binding rule (from [007](../007-storage-active-ticks-scheduler/) downgrade protection):** 010 must treat `isPreserved()` as "refuse writes". When storage is preserved, `emit` adds nothing to the field or the buffer.

**Decision (user, 2026-10-26):** when an interval is dropped (`abandon()`), the emissions already drained into it are re-queued into the pending buffer and join the next interval. Nothing is lost. `grossEmitted`, `emittedLastInterval` and `dominantSource` are updated only when the interval commits, so a dropped interval leaves them unchanged.

## Goal

Implement `PollutionApi.emit` so anything, the block emitter engine (011) first, can add pollution safely from the server thread. Core ships no mappings, so tests call the API directly or use a test-only source.

## Design references

- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows), [3.5 emitter API](../../../design/architecture/#35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content), [4 errors](../../../design/architecture/#4-conventions)
- Task [005](../005-shared-interfaces-and-diffusion/): API interface

## Behaviour

- `emit(level, pos, amount)`:
  - **Server thread only.** A call from another thread is rejected and logged; it does not mutate state.
  - `amount` must be finite and ≥ 0. Anything else is dropped and logged **once per source** (source = calling class or an optional source key), so a broken adapter cannot flood the log. `amount == 0` is a silent no-op.
  - Adds to a per-chunk **pending buffer**. It does not change the field mid-interval, which preserves the determinism contract.
- **At interval start** the scheduler drains the buffer into the snapshot (step 1 of the interval step) and keeps the drained copy until the interval ends. **On commit** it then:
  - sets `emittedLastInterval` for each chunk;
  - updates `dominantSource` to the highest-rate position that emitted in the chunk, with its rate (ties broken by lowest packed `BlockPos`, for determinism);
  - adds the total to the world's `grossEmitted`, which never decreases.
- A chunk with no emission in an interval has `emittedLastInterval = 0` and keeps its last `dominantSource` only if it still emitted something; otherwise it is cleared.
- Emission into an unloaded or ungenerated chunk is allowed (the field is sparse), but never loads one.
- The buffer is bounded by the config key `maxEmittersPerChunk` (integer, default 4096, range 1 to 1,000,000): the cap on distinct emitter positions tracked per chunk per interval. Past the cap, amounts still count in the chunk total but are not attributed to a position (so they cannot become `dominantSource`). One log line per interval when exceeded. Aggregation is by position, so repeated calls from the same block sum. The key is tunable through `/pollution tune` like every registry key.
- Log-once is per calling class **per dimension** for invalid amounts, and per calling class for off-thread calls. A paused (`isPreserved()`) dimension or world drops the emission with one log line per dimension per session.
- Read-only accessor `DimensionPollution.pendingEmission(long chunkKey)` returns the buffered, not yet drained total in PU (0 for a paused dimension). 009 and 011 tests use it.
- `emissionMultiplier` (008) is applied **inside the engine in 011**, not here, so API users see exact amounts.

## Files owned

`mod`: `PollutionApi` implementation (emit), the buffer, the drain hook in the scheduler. `core`: a pure `EmissionBuffer` with the aggregation and dominant-source rule so it is unit-tested without Minecraft.

## Tests to write first

1. Unit (`EmissionBuffer`): sums by position; dominant source choice including ties; zero, negative, NaN and infinite amounts rejected; log-once per source.
2. Unit: draining twice does not double count; `grossEmitted` is monotonic.
3. GameTest: `emit` into a chunk, after one interval `getLocal` rose by the amount, `grossEmitted` matches, and `dominantSource` is the emitting position.
4. GameTest: an off-thread call is rejected and state is unchanged.
5. Unit and GameTest: abandoning an interval re-queues the drained emissions; the next interval applies them once, and `grossEmitted` counts them once. Draining, abandoning and draining again does not double count.
6. Unflushed pending emissions are lost on restart by design; a test documents this, and that already-flushed emissions are saved.
7. API-purity check passes (no internals referenced from `…api.*`).

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

The mapping format and block scanning (011), absorption, the removal call (M5), any shipped mapping.
