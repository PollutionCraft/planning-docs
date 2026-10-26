---
title: "ADR 0003: Pollution grid, storage, spread, and simulation scope"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20. The user confirmed the grid unit and configurable spread, and asked for simulation and attacks to be reconciled; the reconciliation is below.
- **Context:** M1–M3 need a persisted field that spreads and is absorbed, within the tick budget ([architecture 5](../../architecture/#5-non-functional-budget)).

## Options considered

| Question | Options considered |
| --- | --- |
| **Grid unit** | Per block (too costly); **one Minecraft chunk** (GTNH, GTM, Create: Smog); a larger region, like Factorio's 32×32 tiles |
| **Storage** | Level `SavedData` sparse map (GTM); data attached to each chunk (Create: Smog). Chunk attachments freeze while unloaded. |
| **Spread** | Fixed fraction above a threshold (Factorio); gradient-limited (GTNH); fixed amount (GTM) |
| **Scope** | Simulate loaded chunks only; simulate every stored chunk |

## Decision

**Grid unit: one Minecraft chunk, 16 × 16 blocks in X and Z, full world height.** Not 16×16 chunks.

**Storage:** one sparse `SavedData` map per dimension, keyed by chunk. It carries a `dataVersion` and prunes chunks below `epsilon`.

**Spread:**
- Fixed fraction above a threshold, from Factorio.
- **Configurable:** `spreadIntervalTicks` (default **20 = 1 s**; Minecraft runs at 20 ticks per second, and 1 s matches Factorio's real-time pace), `spreadFraction` per neighbour (default **0.02**), and `spreadThreshold`.
- Config validation rejects `4 × spreadFraction ≥ 1`.
- The step is double-buffered and independent of order.
- GTNH's gradient limit is an optional config mode.

**Simulation vs attacks:** two separate rules ([architecture 3.4](../../architecture/#34-pollution-simulation-vs-attack-eligibility)).

| | Simulation (numbers) | Attacks (mobs) |
| --- | --- | --- |
| Where | Every stored chunk, loaded or not. Chunks are never loaded or generated to simulate them. | Any **loaded, entity-ticking** chunk, whatever keeps it loaded (player, chunk loader, forced). |
| When | Only on ticks with ≥ 1 player online. This is a **recommendation**, confirmation pending; it matches `activeTicks` in [ADR 0002](../0002-pollution-model-global-local/). | Same gate |

The two rules don't conflict: simulation keeps the numbers moving everywhere, and attacks need mobs, which only exist in ticking chunks. [ADR 0008](../0008-siege-in-unattended-chunks/) proposes how mobs reach loaded chunks with no player nearby.

## Consequences

- Cheap simulation with no freezing.
- Pollution can exist as numbers in chunks that were never generated, which is harmless.
- The map grows with the polluted area. Decay and pruning bound it.

## Blast radius / reversibility

The save format is affected. The grid unit cannot change without breaking saves; everything else is config.

## Revisit if

- Profiling exceeds the budget.
- Players need more detail than one chunk.
