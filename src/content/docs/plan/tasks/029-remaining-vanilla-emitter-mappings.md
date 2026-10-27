---
title: "029: Vanilla emitter mappings after the furnace"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-27): accept with follow-ups

Branch `feature/029-remaining-vanilla-emitter-mappings`, not yet committed, pushed or merged. Judged from Heimdall's review, Brokkr's report and the source findings (all read). I have no shell and did not rerun anything. Reported (Heimdall's runs on a quiet worktree): clean build and 89 of 89 GameTests twice, core 58 and mod 200 unit tests, class-load check passed. Data only: nothing changed under `mod.emitter`, `config`, `PollutionManager`, `core` or `api`.

**What ships** (seven files under `data/pollutioncraft/pollution_emitters/minecraft/`): furnace 1.0 (011, unchanged); blast furnace 2.0 and smoker 2.0 while `lit=true`; campfire 0.25 while `lit=true`; torch, wall torch and lantern 0.01, always active. Not mapped: soul campfire, soul torch, soul wall torch, soul lantern, candles, jack o'lantern, lava, fire.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Activity state of each block read in the sources before mapping | Pass | `029-source-findings.md` in the mod repo (property, who sets it, flag) |
| One GameTest per mapping, on the shipped data | Pass | blast furnace, smoker, campfire (out and relit), torch, wall torch, lantern |
| Lit raises the chunk by exactly the rate, unlit adds none; always-active while placed, stops when removed | Pass | the same tests; torch sums compared within 1e-9, 1.0, 2.0 and 0.25 exactly |
| Excluded blocks emit nothing | Pass | `blocksTheUserLeftOutEmitNothing` (soul variants, lit candle); red via mutants |
| 100 torches give 1.0 PU, and 2.0 with `emissionMultiplier` 2 | Pass | `oneHundredTorchesGiveOnePuAndTwiceThatWithAMultiplierOfTwo` |
| Blast furnace and smoker ship at exactly twice the furnace's rate | Pass | `theBlastFurnaceAndSmokerBurnTwiceAsFastSoShipAtTwiceTheFurnaceRate`; Heimdall's mutant (smoker at 1.0) fails it. It encodes the rule, so retuning all three together needs no test change |
| Core without the `minecraft` data emits nothing (011 regression) | Pass | `anEngineWithNoRulesEmitsNothingForALitFurnace`, unedited and green |
| Cost with the real mappings inside 0.5 ms/tick | Pass | 300 torches and lanterns in each of 20 chunks (6,000 tracked): 0.160 to 0.186 ms/tick, 0.14 µs per block. A chunk at the 2,048 cap: 0.080 to 0.085 ms/tick. Rescan mean 23 to 39 µs; the capped chunk's p99 (101 to 176 µs) is the finishing tick, accepted in 031 |

**Decisions recorded (user, 2026-10-27):**
1. **Pollution follows fuel burn rate.** The blast furnace and smoker burn fuel twice as fast as a furnace (NeoForge 21.1.264: `getBurnDuration` is divided by 2), so they ship at **2.0**, not the plan's 1.0. The table below is updated. Recorded in the brief's Decisions.
2. **The campfire can be put out** and relit, which contradicts "it never goes out". It is mapped with `lit=true`, so an out campfire emits nothing. No decision was needed; the user has been told.

**Process notes, accepted:**
- Red-first was met in grouped runs, not one run per block: the blast furnace went red alone first, the other blocks went red together (each failing for its own reason before its file existed), and the rate test and negative controls went red through mutants. Heimdall judged this enough. For a future mapping task, "one block at a time" is a sequencing preference, and the evidence (a quoted failing line per test) is what counts.
- Two engineers running in one worktree corrupt each other's results (shared run directory and log). The lead tells the reviewer before asking for more runs.

**Follow-ups:**
1. **GameTest run time.** A full local run takes 3 to 5 minutes because slow batches write far chunks to btrfs (8.7 s on tmpfs). The rule stands from 031: if CI's GameTest step goes over about 3 minutes, move the `measure…` tests (about 37 s together) behind an opt-in Gradle property. Heimdall, low priority: a README tip for local runs (a tmpfs `mod/run`).
2. **P4 performance run (023):** the capped chunk's rescan p99 sits at about 0.1 ms (the finishing tick); the mean is the criterion.
3. **Rates are placeholders for the P4 playtest.** Known limits carried from 031: the per-chunk cap ranks by position, not by rate, and 2,048 torches in one chunk give 20.48 PU per interval.
4. **M1 is not yet fully met.** The furnace minecart (032) and GregTech machines (012) are still to come.

**Blocked by:** ~~031~~ (**accepted 2026-10-27, so 029 can start once 031 is merged**). 031 delivered: an entry **without `active_when` is always active**, and the cap `maxTrackedPerChunk` (default 2,048, lowest packed positions win). Measured: about 58,000 to 60,000 active tracked blocks use the whole 0.5 ms/tick, 0.13 to 0.18 µs per block; 6,000 blocks cost 0.155 ms/tick in total. **Scope and starting rates set by the user, 2026-10-27** (rates accepted as placeholders for the P4 playtest). The first slice (the furnace) is [011](../011-block-emitter-engine-and-furnace-mapping/); the furnace minecart is [032](../032-furnace-minecart-emitter/), not this task.

## Goal

Add the vanilla blocks that "burn something" as data mappings, in 011's format, in the `…compat.minecraft` data folder. No engine code (031 owns that). This is the data half of the emitter set for M1; M1 is fully met for the alpha only after 032 (furnace minecart) and 012 (GregTech machines, built last) also pass ([brief](../../../brief/overview/), decisions of 2026-10-27).

## Scope (user decision, 2026-10-27)

**Thematic rule:** a block emits if it burns something, even when it has no fuel mechanic.

| Block | Decision | Rule | Starting rate (PU per interval) | Why this rate |
| --- | --- | --- | --- | --- |
| `minecraft:blast_furnace` | In | `active_when lit=true` | **2.0** (user, 2026-10-27; first planned as 1.0) | Pollution follows fuel burn rate. **Fact (sources):** `getBurnDuration` returns the base value divided by 2, so it burns fuel twice as fast as a furnace. The plan's 1.0 rested on an assumption that the sources refuted. |
| `minecraft:smoker` | In | `active_when lit=true` | **2.0** (same decision) | Same: `getBurnDuration` is also divided by 2. |
| `minecraft:campfire` | In | `active_when lit=true` | 0.25 | A quarter of a furnace (user guidance). **Fact (sources):** it has a `lit` state and **can be put out** (water, shovel) and relit (burning arrow, flint and steel, fire charge), unlike the user's "it never goes out". An out campfire emits nothing. The user has been told; no decision was needed. |
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
- Light sources are always active: the entry has **no `active_when` field at all** (`{ "block": "minecraft:torch", "rate": 0.01 }`). An `active_when` that is present must be complete, or the entry is rejected. Stateful blocks use `active_when lit=true`.
- **Cap interaction (known limitation from 031):** the cap of 2,048 tracked blocks per chunk ranks by position, not by rate, so in a chunk with more than 2,048 mapped blocks, torches in the west or north can displace a furnace. Do not work around it in the data; report it if a test or the playtest hits it.
- Wall variants are separate blocks and need their own entry (`wall_torch`).
- A mapping is only added after its activity state is **verified in the NeoForge 21.1.x sources**, and the finding is written in the PR (the property name, who sets it, and the flag it is set with, as 011 did for the furnace).

## Files owned

`mod` → `…compat.minecraft`: the mapping data files above, and the GameTests. Nothing in `…mod.emitter.*`; if an engine change seems needed, stop and return to 031.

## Conditions

- Verify each block's activity state in the sources before mapping it; record the finding. If a block does not behave as assumed (for example the campfire has no usable `lit`), do not map it: report back to Odin.
- **One GameTest per mapping**, using the real shipped data.
- **A failing run before each test** is implemented, pasted in the report.
- **Cost measured with torches in the hundreds** against the 0.5 ms/tick budget, with the real shipped mappings: for example 300 torches and lanterns in each of 20 chunks, and a chunk at the 031 cap. 031 already measured the engine with a test block (6,000 blocks: 0.155 ms/tick); this check confirms the shipped mappings behave the same. It does not need to repeat the engine's dense-layout cases. Report the total ms/tick and the 99th percentile of the rescan slice.
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
