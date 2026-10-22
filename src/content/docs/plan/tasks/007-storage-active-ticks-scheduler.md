---
title: "007: Storage, activeTicks, and interval scheduler"
status: proposed
owner: Heimdall
---

**Blocked by:** 005 (field, diffusion step, interfaces).

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
