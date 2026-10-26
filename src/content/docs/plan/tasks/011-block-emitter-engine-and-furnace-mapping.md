---
title: "011: Block emitter engine and furnace mapping"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-26): accept with follow-ups

Branch `feature/011-block-emitter-engine`, commit `74691d9`, not yet pushed or merged. Judged from Heimdall's design review, code review and Brokkr's report (all read). I have no shell and did not rerun builds. Reported results: 52 of 52 GameTests (three consecutive runs by Brokkr, two by Heimdall), core 58 and mod 144 unit tests; with 009b merged, 53 of 53 and mod 149 (Heimdall's figures).

| Criterion | Result | Evidence |
| --- | --- | --- |
| Mapping parse: valid, missing fields, bad rate, unknown block/property, tag expansion | Pass | `MappingValidatorTest`; `resolutionSkipsUnknownThingsAndExpandsTags` |
| Test mapping: active emits `rate` per interval, inactive nothing, removal stops it, unloaded and non-ticking chunks do not emit | Pass | lamp GameTests; real region-ticket and `setChunkForced` paths, no seam used for them |
| **M1 with the real furnace mapping** | **Pass** | A burning furnace (coal in a real furnace, waits for `lit`) raises its chunk by exactly 1.0 PU per interval and `grossEmitted` by 1.0. An unlit furnace in another chunk stays at 0.0. `emissionMultiplier` 2 gives exactly 2.0. Runs through `PollutionManager.tick` (gate, engine, scheduler). Heimdall's mutants break it. |
| Core without mapping data loads and emits nothing | Pass | `anEngineWithNoRulesEmitsNothingForALitFurnace`, with a control engine |
| Adapter-import check for `…compat.minecraft` | Pass, trivially | No Java class there; the mapping is data only |
| `lit` verified on the furnace | Pass | `AbstractFurnaceBlock.LIT` in the sources, and proven at runtime by the M1 test |
| Budget: inside 0.5 ms/tick with 100 emitters | Pass | Total 0.07 to 0.095 ms/tick; emission pass about 17 to 19 µs per interval; worst rescan slice max 72 to 76 µs (limit 100) |
| Invalid entries skipped and logged, never fatal | Pass | validator and resolution tests |
| Nothing out of scope | Pass | `PollutionManager` changed by one engine call and one Javadoc line; no new config key |

**Design changes versus the original page, all approved in Heimdall's step-0 review and now binding (they replace the lines they contradict):**
1. **Discovery.** The engine tracks the positions of every mapped block per chunk. The block state is read at each interval start, so `lit` changes, removal and replacement need no event. Hooks only add positions: `ChunkEvent.Load` scan, `NeighborNotifyEvent`, and a bounded **rescan every 1,200 ticks (60 s)** as a safety net for blocks placed without an update (building tools, other mods). `ChunkEvent.Unload` and `ServerStoppedEvent` drop positions.
2. **When it runs.** The engine is called on every gated tick, before the scheduler. The **emission pass runs only on the tick an interval starts**; other ticks do only the bounded rescan (at most 8 palette checks and 3 section walks per tick). Pollution is sampled once per interval, so a pulse shorter than an interval can alias. The long-run mean is right. Accepted.
3. **`/pollution step` does not run the engine.** A `step` advances the field with whatever is already buffered; it does not make furnaces emit. To see furnace emission, let real ticks run with a player online.
4. **Data path convention.** Mapping files are `data/<namespace>/pollution_emitters/<target mod id>/<name>.json`. The shipped ones use namespace `pollutioncraft`; the folder names the mod the blocks belong to. The furnace mapping is `data/pollutioncraft/pollution_emitters/minecraft/furnace.json`. This is what "the `…compat.minecraft` package" means for data: the `minecraft` folder. When compat splits out (task 027), each `<target mod id>` folder moves with its adapter. A datapack overrides a rate by replacing the file at the same path. The format is documented in `docs/emitter-mappings.md` in the mod repo, not under `data/` (a non-JSON file there logged "Invalid path in pack" on every reload).
5. **Conflicts.** If two entries match the same block state, the lowest resource id wins and one warning names both.

**Follow-ups:**
1. **Tracked positions are uncapped per chunk** (only emission is capped, by `maxEmittersPerChunk`). The emission pass is O(tracked): about 150 µs at 1,024 emitters. Re-check at the P4 performance run (023); if it shows, slice the pass or cap positions per chunk.
2. **Worst-case rescan slice has little margin** (max 72 to 76 µs against 100 µs). `RESCAN_SECTIONS_PER_TICK` is the knob.
3. **Overflow:** a rate times multiplier that overflows to infinity is dropped and logged by 010's buffer. The wider PU upper-bound decision from 010 is still open (see the 010 page).
4. **Each other vanilla block (029)** must check that it exposes a usable activity state before getting a mapping.

**Blocked by:** 010 (emit into the pending buffer). **First slice, user decision 2026-10-22: the vanilla furnace only.** Other vanilla blocks are task 029.

**Conditions carried from 010 and 009 (Odin, 2026-10-26):**
- Paste a red run for each new test before implementing it. Missing this again is grounds for rejection.
- Measure `PollutionApi.emit` cost inside the 100-emitter budget. `PollutionManager.dimension(level)` and `world(server)` rebuild a data-file path on every call; cache the lookup if it shows.
- Engine tests may read buffered amounts with `DimensionPollution.pendingEmission(long)`.
- Config keys are camelCase (architecture §4).

## Goal

Make vanilla blocks generate pollution through data, with no per-block code. Core ships the engine and mapping format; the furnace mapping ships as data in the `…compat.minecraft` package inside core ([ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §2). Core without that package loads but emits nothing.

## Design references

- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows), [4 adapter rule](../../../design/architecture/#4-conventions)
- [ADR 0005](../../../design/decisions/0005-custom-mod-vs-existing-mods/), [ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/), [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/) (rung 1: data mapping)

## Behaviour

- **Mapping format** (datapack/data JSON, reloadable): a block id or block tag, a `rate` (PU per interval, finite and ≥ 0), and an `active_when` block-state property with expected value (for example `lit=true`). Invalid entries are skipped and logged, never fatal.
- **Engine:** for each loaded, block-ticking chunk, per interval, call `PollutionApi.emit` for the tracked mapped blocks whose property matches. Discovery strategy as decided: see the acceptance note above (tracked positions, events add, 60 s rescan, emission only at interval start). **Budget:** inside the 0.5 ms/tick field budget ([architecture 5](../../../design/architecture/#5-non-functional-budget)) with 100 active emitters.
- **Furnace mapping** in `…compat.minecraft`: `minecraft:furnace`, `active_when lit=true`, default rate **1 PU per interval** (the PU scale: [glossary](../../../reference/glossary/)), as a named default in data. **Verify first** that the furnace exposes `lit`, and record the finding.
- Rates are overridable by a datapack or pack config (tuning lives in the pack, not in code) and visible through `/pollution tune` as an emission multiplier (009).

## Files owned

- `mod`: engine, loader, tracker (`…mod.emitter`). The format doc is `docs/emitter-mappings.md` in the mod repo.
- `mod` → `…compat.minecraft`: the furnace mapping data only, at `data/pollutioncraft/pollution_emitters/minecraft/furnace.json`.
- Test resources (core's own, never shipped): a test-only block and mapping for engine tests.

## Tests to write first

1. Unit: mapping parse (valid, missing fields, negative or NaN rate, unknown block, unknown property) and tag expansion.
2. Unit/integration: with the test-only mapping, an active block emits `rate` per interval and an inactive one emits nothing; removing the block stops emission; unloaded chunks do not emit.
3. GameTest (M1, real furnace mapping): a lit furnace raises its chunk's pollution; an unlit furnace adds none.
4. Core alone (no `…compat.minecraft` data) loads and emits nothing.
5. Adapter-import check passes for `…compat.minecraft`.

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

Other vanilla blocks (029), the GTM adapter (012), absorption, and any non-data (Mixin or reflection) integration.
