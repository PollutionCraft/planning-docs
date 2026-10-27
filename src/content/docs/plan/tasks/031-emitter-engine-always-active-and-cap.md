---
title: "031: Emitter engine: always-active rules and a tracked-position cap"
status: proposed
owner: Heimdall
---

**Blocked by:** 011 (accepted). **Blocks:** 029 (the vanilla mappings need both additions). **Origin:** user decision 2026-10-27 (light sources emit, and they have no activity state; soul torches and soul lanterns do not; the furnace minecart is built after P2, so 031 and 029 come first); the cap is follow-up 1 of the 011 acceptance. Split from 029 by Odin so the engine change is reviewed and measured on its own, before any data depends on it.

## Goal

Two small additions to the block emitter engine from [011](../011-block-emitter-engine-and-furnace-mapping/), with no shipped mapping:

1. A mapping entry may omit `active_when`. Such a block is **always active**: it emits its `rate` every interval for as long as it is placed in a loaded, block-ticking chunk.
2. A **cap on tracked positions per chunk**, so a chunk with thousands of mapped blocks cannot make the engine's cost or memory unbounded.

## Design references

- [Task 011](../011-block-emitter-engine-and-furnace-mapping/) acceptance note (discovery, follow-up 1), `docs/emitter-mappings.md` in the mod repo (the format; this task owns the edit)
- [Task 010](../010-emitter-api/): `maxEmittersPerChunk` caps *attributed* positions in the buffer; this task caps *tracked* positions in the engine. They are different limits.
- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows), [5 budget](../../../design/architecture/#5-non-functional-budget)

## Behaviour

- **Mapping format:** `active_when` becomes optional. An entry without it is always active. An entry with `active_when` behaves exactly as today. A malformed `active_when` (for example a property without a value) is still an invalid entry: skipped and logged. The mod does not guess.
- **Removal still works without an event.** The engine reads each tracked position's block state at every interval start, as today. An always-active block is dropped when the block there is no longer a mapped block. Only the "is the state active" test is skipped.
- **Cap:** a new config key (camelCase, in the registry, so `/pollution tune` gets it for free), working name `maxTrackedPerChunk`. Integer, bounds to be set in the design step, starting default **2,048** (placeholder; must be above "hundreds of torches" and below the 4,096 buffer cap, so attribution never overflows first). Past the cap, further positions in that chunk are **not tracked** and emit nothing. One log line per chunk per rescan period, not per block.
- **The cap must be deterministic.** Which positions are kept must not depend on load order, placement order or restarts. Constraint, not a prescription: the same blocks in the same chunk give the same tracked set after unload, reload and restart (for example, the lowest packed positions win). Heimdall's design step picks the mechanism.
- **The cap is read when a chunk is scanned or rescanned**, like the other engine constants. A change through `/pollution tune` applies from the next scan.
- Everything else in 011 holds: only block-ticking chunks emit, sampling is once per interval, `emissionMultiplier` is applied in the engine, the 60 s rescan.

## Files owned

`mod`: `…mod.emitter.*` (`MappingEntry`, `MappingValidator`, `EmitterRules`, `EmitterEngine`, tracker), `config/ConfigRegistry.java` and `config/ServerConfig.java` (the one new key and its accessor only), `docs/emitter-mappings.md`. Tests: the existing `MappingValidatorTest`, `EmitterGameTests`, plus new ones. A **test-only** always-active mapping in the GameTest resources (never shipped). No shipped mapping.

## Conditions

- **Design step first.** A short design note, reviewed by Heimdall before code, covering: the cap mechanism and its determinism; what happens to a tracked position when a chunk goes over the cap after a rescan; the default and bounds.
- **Red run for every test before implementing**, with the failing lines pasted. Missing this is grounds for rejection.
- **Cost measured**, against the 0.5 ms/tick budget (architecture 5): see test 6.
- Camelcase config key. Update `docs/emitter-mappings.md` in the same change.

## Tests to write first

1. Unit: an entry without `active_when` parses as always-active; an entry with a half-specified `active_when` is rejected; existing parse cases unchanged.
2. GameTest, test-only always-active block: placed, emits `rate` per interval with no property involved; removed, stops from the next interval; in a non-ticking chunk, emits nothing; after unload and reload, emits again.
3. GameTest: an `active_when` entry still emits only while its state matches (regression for 011).
4. GameTest, cap: place more than the cap in one chunk (use a low configured cap); the tracked count equals the cap; the emitted amount equals cap × rate; one log line; a second chunk is unaffected.
5. GameTest, determinism: after unload and reload the same positions are tracked; adding a block with a lower packed position replaces the highest tracked one (or whatever rule the design picks, stated and tested).
6. Cost (`measure…` test): hundreds of always-active blocks in one chunk, the cap's worth in one chunk, and many chunks each holding hundreds. Report the emission pass, the chunk-load scan (typical and worst), the rescan slice (**99th percentile and mean**, not the single-tick maximum) and the total ms/tick with 2,500 spreading chunks. Must stay inside 0.5 ms/tick.
7. Adapter-import and architecture checks stay green.

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

Any shipped mapping (029). Entities (032). A per-block-type cap. Aggregating over-cap blocks into one emission (a possible later change if playtests show players using the cap to cap their own pollution).
