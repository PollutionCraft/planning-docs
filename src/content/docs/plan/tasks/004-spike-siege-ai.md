---
title: "004: Spike: mob siege AI"
status: proposed
owner: Heimdall
---

**Blocked by:** task [001](../001-mod-scaffold-and-ci/). A timeboxed spike: the code is throwaway and is never merged. The deliverable is a findings note. Architecture risk R1.

## Goal

De-risk M4, the alpha's highest technical risk. Using running code, show whether a zombie can do the following:

1. Path toward a fixed target position inside a fully walled box.
2. When no full path exists, move to the closest reachable point, break the blocking block over time (with break progress shown), and repath.
3. Reach and break the target block.

Measure with `spark`: MSPT with 10, 30, and 60 siegers against one box. The design budget is ≤ 1.5 ms/tick at 30 ([architecture 5](../../../design/architecture/#5-non-functional-budget)).

## Also verify (needed for the design)

- **Goals:** how to add goals to vanilla mobs selected by an entity-type tag when they join the level, without Mixins if possible. Check that this works for a modded mob too, since custom siege mobs are allowed.
- **`mobGriefing=false`:** user decision: it must **not** stop siege breaking. Show breaking still works with the gamerule off, and note which code path bypasses the vanilla and loader griefing checks.
- **Drops:** breaking with item drops on (the configurable default) and off.
- **Hardness:** how to cap hardness, and that blocks with hardness < 0 are never broken.
- **Unattended loaded chunks:** user decision: any loaded chunk can be attacked. In a chunk force-loaded with `/forceload` and no player within 128 blocks, record:
  - whether hostile mobs spawn
  - whether they despawn
  - whether goals tick
  - what it takes to keep a sieger alive and acting (for example `setPersistenceRequired`)

  This tests [feasibility's design gap](../../feasibility/#siege-why-it-is-the-hard-part) and feeds [ADR 0008](../../../design/decisions/0008-siege-in-unattended-chunks/).
- **Technique:** if time allows, read how Improved Mobs treats breakable blocks in pathfinding ([architecture 2.3](../../../design/architecture/#23-mob-behaviour)). Do not copy ARR code.

Feeds requirement M4 and tasks 018–021.

## Design references

- [ADR 0006](../../../design/decisions/0006-mob-siege-rules/) (accepted rules; `mobGriefing` is ignored and `siege.breakBlocks` config is the off switch)
- [ADR 0008](../../../design/decisions/0008-siege-in-unattended-chunks/) (proposed: siege mobs in unattended chunks)
- [Architecture 3.3, Siege](../../../design/architecture/#33-key-flows)

## Files owned

Spike branch `spike/004-siege-ai` in the mod repo (not merged).

## Deliverable

A findings note covering:

- the approach (goals used and pathfinding strategy)
- a step list or clip showing the scenario working or failing
- MSPT measurements
- failure modes (stuck mobs, oscillating repaths)
- findings for each "also verify" item
- a recommendation

## Commands

`./gradlew runClient` for observation. Optionally one probe GameTest via `./gradlew runGameTestServer` (zombie and sealed box, block broken within T ticks), as a first sketch of the M4 test.

## Timebox and out of scope

One to two working sessions. Out of scope: pollution logic (use a hard-coded target), the gap-filler mod's custom mobs, and production code.
