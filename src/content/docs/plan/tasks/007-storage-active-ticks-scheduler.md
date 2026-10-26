---
title: "007: Storage, activeTicks, and interval scheduler"
status: proposed
owner: Heimdall
---

**Blocked by:** 005 (field, diffusion step, interfaces).

## Decisions (user, 2026-10-22)

- **Interval write rule (binding on 009 and 010):** an interval snapshots the field on its first tick and writes on its last, so any field write in between would be lost. All field writes must go through `stepNow` or `abandon()`, or be queued until the interval ends.
- **Unimplemented API methods:** `emit` and `isAggressive` throw `UnsupportedOperationException` until 010 and 016 implement them. Keep that. Do not wire callers early.
- **Config accessors (also on [008](../008-server-config/)):** when 007 adopts the 008 accessors (reading `PollutionCraftMod.config()` once at the scheduler boundary), add a test that goes through the scheduler.

- **Downgrade protection (done, in scope):** records the mod cannot read are kept and written back unchanged. A preserved dimension record is not simulated. A preserved world record stops `activeTicks` and the whole simulation. The storage exposes `isPreserved()`; [010](../010-emitter-api/) must treat it as "refuse writes".

## Follow-ups

- **Step cost:** a unit test at 2,500 chunks gives 0.122 ms/tick (median 2.44 ms per step) against the 0.5 ms budget. Live-server spark profiling, including the interval-start tick, waits until more is implemented (P4).

## Goal

Persist the pollution field per dimension, count `activeTicks`, and run the interval step time-sliced on the server, so pollution spreads in a live world. Absorption is stubbed (zero) until P2.

## Design references

- [Architecture 3.2](../../../design/architecture/#32-data-model), [3.3 interval step](../../../design/architecture/#33-key-flows), [3.4](../../../design/architecture/#34-pollution-simulation-vs-attack-eligibility), [3.6 time source](../../../design/architecture/#36-global-time-source), [5 budget](../../../design/architecture/#5-non-functional-budget)
- [ADR 0003](../../../design/decisions/0003-storage-and-simulation/) (accepted)

## Behaviour

- **Storage:** one `SavedData` per dimension holding the sparse field. Fields per chunk as in 3.2 (the transient `lastIntervalStats` is **not** saved). Both the per-dimension record and the world record carry `dataVersion`. Corrupt entries are skipped and logged, never fatal. Chunks below `epsilon` are pruned. The save must stay under 200 KB per dimension at 2,500 chunks.
- **World record:** `activeTicks`, `grossEmitted`, and the derived `pressure` slot (computed by 016; this task stores the inputs and exposes a read that returns 0 until 016 lands).
- **`activeTicks`:** incremented once per server tick while at least one player is online. Persisted. Never decreases.
- **Gate:** the simulation advances only on ticks with ≥ 1 player online. **This is a recommendation still awaiting user confirmation** ([architecture 3.4](../../../design/architecture/#34-pollution-simulation-vs-attack-eligibility)); implement it behind one named predicate so the alternative is a one-line change.
- **Scheduler:** every `spreadIntervalTicks`, snapshot the field, process it in slices across the interval (a per-tick time or chunk budget), and apply deltas at the end. Uses 005's `DiffusionStep`, so results match the unit-tested logic regardless of slicing. Never loads or generates chunks.
- **Entry point for 009:** a `stepNow(level, n)` that runs the same code path synchronously. The scheduler and the command must not diverge.
- **`PollutionApi` read methods** (`getLocal`; `getPressure` returning the stored value) get their real implementation here.

## Files owned

`mod`: `SavedData` classes and codec, the scheduler, the `activeTicks` tick hook, the `PollutionApi` read implementation. Update [architecture 3.2](../../../design/architecture/#32-data-model) if the stored shape changes.

## Tests to write first

1. Unit: save/load round trip is lossless; unknown future `dataVersion` and corrupt entries are skipped with a log.
2. Unit: slicing invariance. The result after a sliced interval equals the single-pass `DiffusionStep` result.
3. Unit: `activeTicks` advances only with a player online (fake tick source); never decreases.
4. GameTest: seed a chunk, run intervals, a neighbour becomes non-zero; with no player online nothing changes.
5. GameTest or save-reload test: values persist across a server restart.
6. Performance check: 2,500 stored chunks stay within the 0.5 ms/tick average (measure with `spark` or a tick timer; record the number in the PR).

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

Emission (010), commands (009), config file and validation (008; use a plain defaults object until it merges), absorption (P2), pressure maths (016).
