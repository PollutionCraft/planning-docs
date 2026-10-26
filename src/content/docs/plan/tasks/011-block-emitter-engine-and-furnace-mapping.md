---
title: "011: Block emitter engine and furnace mapping"
status: proposed
owner: Heimdall
---

**Blocked by:** 010 (emit into the pending buffer). **First slice, user decision 2026-10-22: the vanilla furnace only.** Other vanilla blocks are task 029.

## Goal

Make vanilla blocks generate pollution through data, with no per-block code. Core ships the engine and mapping format; the furnace mapping ships as data in the `…compat.minecraft` package inside core ([ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §2). Core without that package loads but emits nothing.

## Design references

- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows), [4 adapter rule](../../../design/architecture/#4-conventions)
- [ADR 0005](../../../design/decisions/0005-custom-mod-vs-existing-mods/), [ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/), [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/) (rung 1: data mapping)

## Behaviour

- **Mapping format** (datapack/data JSON, reloadable): a block id or block tag, a `rate` (PU per interval, finite and ≥ 0), and an `active_when` block-state property with expected value (for example `lit=true`). Invalid entries are skipped and logged, never fatal.
- **Engine:** for each loaded chunk, find the mapped blocks and, per interval, call `PollutionApi.emit` for those whose property matches. Decide, and record in the PR, the discovery strategy that avoids scanning whole chunks each interval (for example register on block-entity load/unload, or on block-state change, keyed by chunk). **Budget:** inside the 0.5 ms/tick field budget ([architecture 5](../../../design/architecture/#5-non-functional-budget)) with 100 active emitters.
- **Furnace mapping** in `…compat.minecraft`: `minecraft:furnace`, `active_when lit=true`, default rate **1 PU per interval** (the PU scale: [glossary](../../../reference/glossary/)), as a named default in data. **Verify first** that the furnace exposes `lit`, and record the finding.
- Rates are overridable by a datapack or pack config (tuning lives in the pack, not in code) and visible through `/pollution tune` as an emission multiplier (009).

## Files owned

- `mod`: engine, loader, tracker. Resources `data/pollutioncraft/…` for the format's schema docs.
- `mod` → `…compat.minecraft`: the furnace mapping data only.
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
