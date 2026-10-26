---
title: "010: Emitter API and pending buffer"
status: proposed
owner: Heimdall
---

**Blocked by:** 007 (storage, scheduler, `grossEmitted`).

**Binding rule (user, 2026-10-22, from [007](../007-storage-active-ticks-scheduler/)):** an interval snapshots the field on its first tick and writes on its last, so any field write in between would be lost. Field writes must go through `stepNow` or `abandon()`, or be queued until the interval ends. The emit buffer is queued. `emit` must not write the field directly.

**Binding rule (from [007](../007-storage-active-ticks-scheduler/) downgrade protection):** 010 must treat `isPreserved()` as "refuse writes". When storage is preserved, `emit` adds nothing to the field or the buffer.

**Open question (Heimdall's 007 review; the user has not chosen):** when an interval is dropped, are emissions already taken into it re-queued or knowingly lost? Options: re-queue them for the next interval (no loss, more state), or accept the loss and log it (simpler). Decide before 010 is built. The answer also affects the `grossEmitted` count that feeds `GlobalPressure`.

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
- **At interval start** the scheduler drains the buffer into the snapshot (step 1 of the interval step) and then:
  - sets `emittedLastInterval` for each chunk;
  - updates `dominantSource` to the highest-rate position that emitted in the chunk, with its rate (ties broken by lowest packed `BlockPos`, for determinism);
  - adds the total to the world's `grossEmitted`, which never decreases.
- A chunk with no emission in an interval has `emittedLastInterval = 0` and keeps its last `dominantSource` only if it still emitted something; otherwise it is cleared.
- Emission into an unloaded or ungenerated chunk is allowed (the field is sparse), but never loads one.
- The buffer is bounded: a configurable per-interval cap on distinct sources per chunk (default generous) with one log line when exceeded. Aggregation is by position, so repeated calls from the same block sum.
- `emissionMultiplier` (008) is applied **inside the engine in 011**, not here, so API users see exact amounts.

## Files owned

`mod`: `PollutionApi` implementation (emit), the buffer, the drain hook in the scheduler. `core`: a pure `EmissionBuffer` with the aggregation and dominant-source rule so it is unit-tested without Minecraft.

## Tests to write first

1. Unit (`EmissionBuffer`): sums by position; dominant source choice including ties; zero, negative, NaN and infinite amounts rejected; log-once per source.
2. Unit: draining twice does not double count; `grossEmitted` is monotonic.
3. GameTest: `emit` into a chunk, after one interval `getLocal` rose by the amount, `grossEmitted` matches, and `dominantSource` is the emitting position.
4. GameTest: an off-thread call is rejected and state is unchanged.
5. Unflushed pending emissions are lost on restart by design; a test documents this, and that already-flushed emissions are saved.
6. API-purity check passes (no internals referenced from `…api.*`).

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

The mapping format and block scanning (011), absorption, the removal call (M5), any shipped mapping.
