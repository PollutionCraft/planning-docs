---
title: "029: Vanilla emitter mappings after the furnace"
status: proposed
owner: Heimdall
---

**Blocked by:** 031 (always-active rule type and the tracked-position cap). **Scope and starting rates set by the user, 2026-10-27** (rates accepted as placeholders for the P4 playtest). The first slice (the furnace) is [011](../011-block-emitter-engine-and-furnace-mapping/); the furnace minecart is [032](../032-furnace-minecart-emitter/), not this task.

## Goal

Add the vanilla blocks that "burn something" as data mappings, in 011's format, in the `…compat.minecraft` data folder. No engine code (031 owns that). This is the data half of the emitter set for M1; M1 is fully met for the alpha only after 032 (furnace minecart) and 012 (GregTech machines, built last) also pass ([brief](../../../brief/overview/), decisions of 2026-10-27).

## Scope (user decision, 2026-10-27)

**Thematic rule:** a block emits if it burns something, even when it has no fuel mechanic.

| Block | Decision | Rule | Starting rate (PU per interval) | Why this rate |
| --- | --- | --- | --- | --- |
| `minecraft:blast_furnace` | In | `active_when lit=true` | 1.0 | Same as the furnace. **Assumption, verify:** it burns fuel per tick at the same speed; only the smelting is faster, so output tied to burn time is the furnace's. |
| `minecraft:smoker` | In | `active_when lit=true` | 1.0 | Same reasoning. |
| `minecraft:campfire` | In | `active_when lit=true` | 0.25 | A quarter of a furnace (user guidance). **Assumption, verify:** it has a `lit` state and can be put out (water, shovel). If so, a campfire that is out emits nothing, which is more correct than the user's "it never goes out"; tell the user if the sources disagree. |
| `minecraft:torch`, `minecraft:wall_torch` | In | always active | 0.01 | One hundred torches equal one furnace. |
| `minecraft:lantern` | In | always active | 0.01 | A torch in a frame. Same rate keeps one number to tune. |
| `minecraft:soul_campfire` | **Out** | — | — | Does not canonically burn wood or coal (user). |
| `minecraft:soul_torch`, `minecraft:soul_wall_torch`, `minecraft:soul_lantern` | **Out** (user, 2026-10-27) | — | — | Consistent with the soul campfire ruling. |
| Candles, jack o'lantern, lava, fire | **Out** (user, 2026-10-27) | — | — | Stay out unless the user adds them. |
| `minecraft:copper_lantern` | **Out of this version** | — | — | Added in Java 1.21.9 (Copper Age, 2025-09-30; [Minecraft Wiki](https://minecraft.wiki/w/Third_Drop_2025)), so it does not exist on 1.21.1. Revisit only if the platform moves ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/)). |
| Redstone parts, beacon, brewing stand, crafter, dispenser, dropper, lever, buttons, piston, observer, comparator, repeater | **Out** | — | — | No burning, or no usable state (user). |
| Furnace minecart | In, **separate task** | — | — | An entity: [032](../032-furnace-minecart-emitter/). |

Anything not in the table is out until the user adds it. Rates are **placeholders for the P4 playtest**, picked against the PU scale (one lit furnace for one interval is 1 PU, [glossary](../../../reference/glossary/)). They live in data and are overridable by a datapack, and scaled by `emissionMultiplier`.

## Design references

- [Task 011](../011-block-emitter-engine-and-furnace-mapping/) (format, data path convention, acceptance note), [task 031](../031-emitter-engine-always-active-and-cap/)
- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows)
- `docs/emitter-mappings.md` in the mod repo

## Behaviour

- One JSON file per block at `data/pollutioncraft/pollution_emitters/minecraft/<name>.json` (the path convention from 011). A block id per file, so a datapack can replace one mapping without touching the others.
- Light sources are always active (no `active_when`). Stateful blocks use `active_when lit=true`.
- Wall variants are separate blocks and need their own entry (`wall_torch`).
- A mapping is only added after its activity state is **verified in the NeoForge 21.1.x sources**, and the finding is written in the PR (the property name, who sets it, and the flag it is set with, as 011 did for the furnace).

## Files owned

`mod` → `…compat.minecraft`: the mapping data files above, and the GameTests. Nothing in `…mod.emitter.*`; if an engine change seems needed, stop and return to 031.

## Conditions

- Verify each block's activity state in the sources before mapping it; record the finding. If a block does not behave as assumed (for example the campfire has no usable `lit`), do not map it: report back to Odin.
- **One GameTest per mapping**, using the real shipped data.
- **A failing run before each test** is implemented, pasted in the report.
- **Cost measured with torches in the hundreds** against the 0.5 ms/tick budget: for example 300 torches and lanterns in each of 20 chunks, and a chunk at the 031 cap, with the real shipped mappings. Report the total ms/tick and the 99th percentile of the rescan slice.
- Rates are named defaults in the data; no rate appears in code.

## Tests to write first

1. GameTest per stateful block (blast furnace, smoker, campfire): lit raises its chunk by exactly the mapping's rate per interval, with `grossEmitted` up by the same amount; unlit adds none. Real fuel or a real way to light it where the block needs one.
2. GameTest per always-active block (torch, wall torch, lantern): placed, raises its chunk by exactly 0.01 per interval; removed, stops.
3. GameTest: a lit soul campfire, a soul torch, a soul lantern and a block from the Out list (for example a lit redstone lamp) add nothing (negative controls for the exclusions).
4. GameTest: 100 torches in one chunk give 1.0 PU per interval (the "100 torches = one furnace" scale), and `emissionMultiplier` 2 doubles it.
5. Cost test as in Conditions.
6. Core without the `minecraft` data folder still loads and emits nothing (011 regression).

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

The engine (031), entities (032), GregTech machines (012), any block not in the table, absorption, and tuning the rates (P4 playtest).
