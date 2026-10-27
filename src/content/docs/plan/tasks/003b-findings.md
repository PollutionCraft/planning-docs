---
title: "003b findings: electric machines, unload, break and the client check"
status: accepted
owner: Heimdall
---

Findings for spike [003b](../003b-spike-gregtech-hook-electric-and-unload/), run 2026-10-27. The headless part was run by Sindri on the throwaway branch `feature/003-spike-gregtech-hook` of the mod repo (never merged; none of its code becomes production code). The client check was run by the user. Follows [003 findings](../003-findings/). Source: Sindri's `003b-sindri-findings.md` in the mod repo's `docs/tasks/`.

**Pin:** GTM `8.0.0-SNAPSHOT+36a6b38` (jar SHA-256 `057f8e97…a1011`, the pack pin), NeoForge 21.1.264. GTM only in the GameTest run's `mods/` folder, never on a compile classpath.

## Answer

**Nothing here refutes [ADR 0016](../../../design/decisions/0016-gtm-activity-hook-shape/).** The hook behaves the same on an electric single block and an electric multiblock with a muffler hatch. Unload and break give no hook event, and GTM's own callbacks are a usable clearing signal. A working machine re-announces itself after a reload, but only if the adapter cleared its de-duplication entry on unload. On the client, the handler was never reached in the user's check, so ADR 0016 rule 4 stays as written.

## 1. Electric single-block machine

`gtceu:lv_electric_furnace` with one `gtceu:raw_iron` inserted through the item capability, next to a `gtceu:creative_energy` source (voltage 32, configured by reflection). Red first (no power source): `events=[]`. Green: `events=[working@590, idle@788] raw=200`. **One working and one idle event** at the furnace's position after de-duplication, from 200 raw `setStatus` calls (one per working tick, as in 003).

## 2. Electric multiblock with a muffler hatch

`gtceu:electric_blast_furnace` (heatproof casings, cupronickel coils, `lv_muffler_hatch`, `mv_energy_input_hatch`, input and output buses; creative energy at 128 V). Red first (formed, powered, not fed): `events=[]`. Green: `events=[working@590, idle@1367] raw=779`. **One working and one idle event at the controller.**

- **Muffler and bus hatches fire nothing.** They have no `RecipeLogic`, so no calls of their own.
- **A muffler whose front face is blocked stops the whole multiblock from starting.** The status stays `IDLE` with no failure reason (`MufflerPartMachine.isFrontFaceFree()`), so it produces no events at all. Useful for 012's with-targets test: face the muffler into open air.
- The energy input hatch needed `setFrontFacing` toward the source to hold energy. Whether an output bus is required was not tested.

## 3. Chunk unload and reload of a working machine

A far chunk forced loaded with `setChunkForced`, a working LV electric furnace in it, forced off then on again.

- **No hook event on unload** (raw calls stay at 47).
- **Observable instead:** `ChunkEvent.Unload`, and GTM's own `MetaMachine.setRemoved` then `onUnload`.
- **The machine re-announces.** After reload it still has `status=WORKING` (saved with the block entity), keeps calling `setStatus(WORKING)`, and with its de-duplication entry cleared the hook reports a second working event. This confirms ADR 0016 decision 3.
- **Caveat 1 (012 must obey):** if the adapter keeps the de-duplication entry across the unload, the second working event is swallowed as "no change". The adapter must clear the working set and the de-duplication entry **together** on unload (ADR 0016 decision 5).
- **Caveat 2:** the re-announce comes only once the chunk is entity-ticking again, about 120 ticks after the reload in this harness. A fixed wait of 100 ticks saw nothing. So a reloaded working machine is briefly missing from the working set, and tests must wait for entity ticking, not a fixed tick count.

## 4. Block break of a working machine

`Level.destroyBlock` on a working electric furnace. **No hook event on break:** no idle event, the de-duplication entry stays at `working=true` (stale), raw calls stop. Observable: `MetaMachine.getMachine` returns null, and GTM's callbacks `onMachineDestroyed`, `setRemoved` and `onUnload` all fire. Unload fires `setRemoved` and `onUnload` but **not** `onMachineDestroyed`, so `onMachineDestroyed` tells a break from an unload. Not tested: player break, explosions, pistons, a multiblock part break.

## 5. Other statuses (recorded, not decided)

- **Power removed mid-recipe:** the machine runs on its buffer for about 420 ticks, then goes `WAITING`; the hook reports idle.
- **Generator** (`gtceu:lv_steam_turbine`): reports `WORKING` while burning steam, then `WAITING` after 65 ticks when its energy buffer is full. A generator with nowhere to send power reads as idle; one feeding a network reads as working. Whether that matters for emission is for 012 and the rates.
- `WAITING` and `SUSPEND` read as not working.

## 6. Interface dispatch

The handler called `isWorking()`, `getBlockPos()` and `getLevel()` through the interface on every call in every run (single block, multiblock controller, steam machine, generator). No `AbstractMethodError` or `LinkageError`, and positions matched. A second interface on `MetaMachine` also dispatched without error. **Not shown:** GTM versions with different signatures; that is the with-targets job's check.

## 7. The user's client check (manual, 2026-10-27)

- **Probe jar:** SHA-256 `58410934b60d9492d0018b248ac1778d7ef92b9a881219718ce6cafbc6196a65`. **GTM:** `8.0.0-SNAPSHOT+36a6b38`. The line `GTM hook active` appeared in all three logs. The machine was Sindri's `/gtprobe build` LV electric furnace with a creative energy source and 4 raw iron.
- The probe logs one `GT_PROBE side=… thread=… pos=… status=…` line for **every** handler call, so about 800 working lines and exactly one idle line per run are the expected shape. They are not one line per change.

| Log | `side=SERVER` | `side=CLIENT` | `status=idle` |
| --- | --- | --- | --- |
| Singleplayer (client and integrated server) | 805 | 0 | 1 |
| Multiplayer client | 0 | 0 | 0 (no probe lines at all) |
| Dedicated server | 805 | 0 | 1 |

No errors in any log except an unrelated Narrator load error.

**Conclusion:** the client never reached the handler, in singleplayer or on a multiplayer client. The bytecode reading (the `isRemote()` early return is also a `RETURN`) predicted it could. **ADR 0016 rule 4 stays as written:** the handler ignores client levels, and 012 needs a test that a client-side call changes nothing. Observed here only for this machine on this pin; not a reason to drop the guard.

## Not shown

- Player break, explosions, pistons, a multiblock part break.
- Real cables and generators feeding a machine (creative source only); muffler hatches other than the blast furnace's; the output-bus requirement.
- GTM versions other than the pin, and the real pack (the P4 spark run covers it).
