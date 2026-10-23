---
title: "005: Shared interfaces, field, and diffusion step"
status: accepted
owner: Heimdall
---

**Done: accepted with follow-ups (2026-10-22).** Merged as PR #2 (commit 7b192dc). Checked against the brief by reading the merged code and the engineer and lead reports; project-owner did not re-run the build. Reported: `./gradlew build runGameTestServer` passes with 27 tests, including the API-purity and adapter-import checks.

Follow-ups, none blocking:

1. **Determinism test is a regression guard only.** It cannot fail against a mutant (lead's ruling). Order-independence rests on the code design: ascending key order and fixed-order neighbour pull.
2. **Task 007 must measure** one full step at 2,500 chunks against the 0.5 ms/tick budget ([architecture 5](../../../design/architecture/#5-non-functional-budget)). `DiffusionStep` allocates a `TreeSet`/`HashMap` per run. If it does not fit, switch to primitive arrays.
3. **Task 010:** reset `dominantSource` each interval when a chunk stops emitting.
4. **ADRs 0013 and 0014 are still proposed.** The package name could still change; a rename is mechanical.

**Not blocked.** Task [001](../001-mod-scaffold-and-ci/) is done and [ADR 0003](../../../design/decisions/0003-storage-and-simulation/) is accepted. **Must merge before every other P1–P3 task.**

## Goal

Create the shared contracts and the one piece of real logic everything else reads: the pollution field and its diffusion step. Pure Java, fully unit-tested, with no Minecraft types in `core`.

## Design references

- [Architecture 3.1](../../../design/architecture/#31-components), [3.2 data model](../../../design/architecture/#32-data-model), [3.3 interval step](../../../design/architecture/#33-key-flows), [3.5 API](../../../design/architecture/#35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content)
- [ADR 0003](../../../design/decisions/0003-storage-and-simulation/) (accepted): grid, spread, determinism
- [ADR 0013](../../../design/decisions/0013-java-package-namespace/): base package `io.github.pollutioncraft`

## Files owned

- `api` (`…api.*`, references only Minecraft, NeoForge and the JDK): `PollutionApi` with `emit(level, pos, amount)`, `getLocal(level, chunkX, chunkZ)`, `getPressure(server)`, `isAggressive(level, chunkX, chunkZ)`. Interface and docs only; the implementation arrives in 007 and 010.
- `core`:
  - `ChunkPollution`: `absorbable`, `persistent`, `emittedLastInterval`, `dominantSource` (packed `long` plus rate).
  - `ChunkIntervalStats` (transient, **never persisted**): `spreadIn`, `spreadOut`, `absorbed`, `decayed` from the last interval. This is what the debug `rates` command (009) and F3 overlay (030) display.
  - `PollutionField`: sparse map keyed by packed chunk `long`.
  - `DiffusionStep`: implemented. Computes from a snapshot, applies deltas at the end, prunes below `epsilon`, and fills `ChunkIntervalStats`. Takes absorption as a function argument.
  - `AbsorptionModel`, `GlobalPressure`, `AggressionPolicy`: **interfaces only**.
- Update [architecture 3.2](../../../design/architecture/#32-data-model) with the transient stats fields in the same change.

## Conventions

- `core` has no Minecraft or NeoForge imports (the existing architecture check enforces this).
- Config values arrive as plain parameters, validated elsewhere (008). `DiffusionStep` still rejects `4 × spreadFraction ≥ 1` defensively.
- Doubles only; no wall-clock or random inputs (determinism contract).

## Tests to write first

1. Diffusion with no absorption: a seeded chunk spreads to its 4 neighbours, and the total rises only by emission.
2. Below `spreadThreshold` nothing spreads.
3. Determinism: the same snapshot and config give bit-identical results, including with the chunks inserted in a different order.
4. Pruning below `epsilon`; both pools spread, `persistent` decays, `absorbable` does not decay.
5. `ChunkIntervalStats` reconcile: for each chunk, `Δ = emitted + spreadIn − spreadOut − absorbed − decayed`.
6. API-purity and adapter-import checks still pass with the new `api` package.

## Commands

`./gradlew build runGameTestServer`, as in task 001.

## Out of scope

Storage and scheduling (007), config (008), the emit implementation (010), the absorption curve (013), pressure and aggression maths (016).
