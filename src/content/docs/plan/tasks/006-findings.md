---
title: "006 findings: GTM 1.21.1 NeoForge readiness"
status: accepted
owner: Heimdall
---

Findings for spike [006](../006-spike-gtm-1-21-readiness/), run 2026-10-20. Dedicated servers on Linux, offline mode, bound to localhost, scratch directories outside the repo. The optional one-hour playthrough was **not** done.

**Outcome:** the spike is done and its recommendation was adopted. [ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/) is accepted: 1.21.1 NeoForge 21.1.264, with GTM pinned to `8.0.0-SNAPSHOT+20261017-095459-36a6b38` by build and hash. 1.20.1 Forge is the fallback.

Open follow-ups:

- the one-hour playthrough (the user is doing it);
- reproducing #5447 before steam progression is relied on (Residual risk 4).

## Summary

- **Both targets boot clean and run the tested recipes.** There were no `ERROR` lines on either, and the idle MSPT is far below budget. The single-block machine and the coke oven multiblock each completed a recipe on both.
- **Limits of the test.** There was no real or fake client on either server, and machines were fed by hoppers or NBT, not by hand. The result shows the snapshot starts and simulates; it says nothing about client, UI, or play feel (see Residual risks).
- **The 1.21 tracker is much busier.** There are about 70 open `type: bug` issues labelled 1.21 or 1.21.1 (38 and 34, partly overlapping), and several are crashes. Maintainers still call 8.0 unreleased, with no date.

## Target B: GTM 8.0.0 snapshot, 1.21.1 NeoForge

| Item | Result |
| --- | --- |
| GTM | `8.0.0-SNAPSHOT+20261017-095459-36a6b38`, the GitHub pre-release `latest-1.21` (2026-10-17). It is not on Modrinth. |
| Loader and Java | NeoForge 21.1.264 (GTM builds against 21.1.248, requires `[21.1,)`). Temurin 21.0.12. |
| Other mods | `spark` 1.10.124. GTM jar-in-jars Configuration 3.1.1, ModularUI 3.3.1-SNAPSHOT, and Registrate 1.3.0. No LDLib on this branch. |
| Boot | Success on first try, new world (seed 6006). |
| Time to `Done (` | 3.7 s world load (log line), about 14 s wall clock from JVM start. |
| Errors | **0** `/ERROR]` lines. WARN only: unresolved JEI and EMI mixin targets (those mods are not installed, so expected), missing refmaps, "already has an associated fluid" for water, lava, and milk, and a tag-registry notice about `c:mineable/*` tags. |
| Idle MSPT | 9 samples, about 4.5 min, no players. `/tick query` average **0.1–0.2 ms** (P95 0.1–0.2 ms, one P99 spike at 2.4 ms). It reached 0.2 ms (P99 0.9 ms) with both machines running. |
| Single block | LV Electric Furnace, powered by an adjacent `gtceu:creative_energy` set to 32 V. Raw iron to iron ingots: **completed**, 3 of 3 ingots. Input was set via NBT, so I could not see whether a hand or hopper insert works. |
| Multiblock | Coke Oven (3x3x3 coke oven bricks, controller on the front middle layer). It **formed**, took 4 coal from a hopper, and produced coke gems and 1000 mB creosote: **completed**. |
| EBF | Not run (see Not verified). |
| Open issues | See the tracker section below. |

## Baseline: GTM 7.5.3, 1.20.1 Forge

| Item | Result |
| --- | --- |
| GTM | v7.5.3 (2026-04-12), the GitHub release. |
| Loader and Java | Forge 47.4.10 (GTM requires `[47,)`). OpenJDK 17.0.20. |
| Other mods | `spark` 1.10.53. GTM jar-in-jars LDLib 1.0.40.b, Configuration 2.2.0, Registrate, and MixinExtras. |
| Boot | Success on first try, new world (seed 6006). |
| Time to `Done (` | 12.5 s world load (log line), about 23 s wall clock from JVM start. |
| Errors | **0** `/ERROR]` lines. WARN only: the same fluid notice, a Forge config auto-correction, and mod-file parse notices. |
| Idle MSPT | 9 samples, about 4.5 min, no players. `/forge tps` overall mean **0.32–0.43 ms** after the first sample (1.3 ms right after boot). It was 0.63 ms with both machines running. |
| Single block | LV Electric Furnace, same setup, fed by a hopper. **Completed**, 3 of 3 ingots. |
| Multiblock | Coke Oven, same layout. **Formed, completed**, 2 coke gems and 1000 mB creosote. |
| Open issues | About 66 open issues labelled 1.20.1 (not triaged). |

The MSPT figures come from two different tools (`/tick query` and `/forge tps`), so compare them only roughly. Both servers are idle and tiny; neither figure predicts load with a real base.

## GTM tracker and release plan (read 2026-10-20)

**Release plan**
- No date and no maintainer estimate was found.
- [#4789 "Remaining things for 8.0.0"](https://github.com/GregTechCEu/GregTech-Modern/issues/4789) is the tracking issue, open and last updated 2026-09-22. Done: machine and multiblock refactors, LDLib removal, spoilage, the Moni migration, and the start of snapshot releases.
- Still unchecked: a MUI check-pass, the lang refactor, modular armor, the terminal autobuild, up-to-date docs, and the addon template.
- The 1.21 branch last moved on 2026-10-17 (the latest merged PR was #5566). Snapshots are published as `latest-1.21`.

**Open issues labelled 1.21 or 1.21.1** (all `type: bug`, no issue carries a `Blocked` label). Those that matter most:

| Issue | Why it matters |
| --- | --- |
| [#5447](https://github.com/GregTechCEu/GregTech-Modern/issues/5447) Solid boilers do not burn fuel (1.21.1 v8) | Hits early-game steam power. Reported with the Gregnautics addon, so it may be the cross-mod case. Not reproduced here. |
| [#5371](https://github.com/GregTechCEu/GregTech-Modern/issues/5371) Server crashes saving ore veins ("Element Reference is not valid in current registry set") | Server-side crash while generating chunks, reported on an older snapshot. Our own fresh-world boot did not hit it. |
| [#5293](https://github.com/GregTechCEu/GregTech-Modern/issues/5293) Startup crash on the snapshot with multiple mods | The crash with other mods noted in ADR 0001. |
| [#5513](https://github.com/GregTechCEu/GregTech-Modern/issues/5513), [#5378](https://github.com/GregTechCEu/GregTech-Modern/issues/5378), [#5049](https://github.com/GregTechCEu/GregTech-Modern/issues/5049) JEI crashes or incompatibility | Client-side, and we picked no recipe viewer yet. |
| [#5560](https://github.com/GregTechCEu/GregTech-Modern/issues/5560) "Crash game" on start (client, JEI) | No detail beyond a screenshot. |
| [#5462](https://github.com/GregTechCEu/GregTech-Modern/issues/5462) `SpoilUtils` not thread-safe (packet encode failure) | Can disconnect clients. |
| [#5520](https://github.com/GregTechCEu/GregTech-Modern/issues/5520) `ConcurrentModificationException` on repeated `/reload` | Matters for datapack or KubeJS iteration. |
| [#5444](https://github.com/GregTechCEu/GregTech-Modern/issues/5444) Creative Chest interactions broken | Test-tool nuisance only. |
| [#5408](https://github.com/GregTechCEu/GregTech-Modern/issues/5408) Multiblocks do not work with AE2 auto crafting | Matters only if AE2 comes in. |

About 14 of the 38 issues labelled `1.21` mention a crash, exception, or server in the title. Most are client-side or mod-interaction crashes. I read only the headers of a few issue bodies and did not triage the rest.

## Not verified

- **No client.** Nothing was joined, rendered, or clicked. All GUI, tooltip, multiblock-preview, and recipe-viewer issues are untested.
- **Machines were driven by NBT and hoppers.** The creative energy block was configured by `/data merge`, and the coke oven and the 1.20.1 furnace were fed by hopper. The NeoForge furnace was fed by NBT. I did not test cables, real LV generators, or hand interaction.
- **EBF not run.** It needs a multi-block setup with an MV-tier energy hatch and heating coils, and I could not drive that from the console in the timebox. The coke oven was the allowed alternative, and it covers multiblock formation and recipe processing only.
- **Idle MSPT is for an empty server** with 4 loaded chunks and a force-loaded area, not for a player exploring. The 5-minute window was 4.5 minutes of samples.
- **Only GTM and `spark`.** The other mods in the candidate list were out of scope. `spark`'s own output did not reach the RCON session, so MSPT came from `/tick query` and `/forge tps`.
- **The one-hour LV playthrough was not done.** That is the user's judgement call.

## Recommendation for ADR 0001

**On R4 as written (boots, runs LV-tier machines and a multiblock, stable on a server), target B passes.** The 8.0.0 snapshot booted clean with no errors, idled at 0.1–0.2 ms, and completed both recipes, the same as the 1.20.1 baseline.

That is a narrow pass. The tracker is the real evidence on stability: a large open bug list on 1.21, a stated 8.0 checklist with items unchecked, and no release date. I would keep B as the recommendation only if the user accepts the points below.

- Pin an exact snapshot hash in the pack, and update it on purpose, not automatically.
- Treat 1.20.1 (option A) as the fallback if the one-hour playthrough or the first modded boot (our adapter plus KubeJS or other mods) turns up crashes. The startup crash with other mods in #5293 is the likeliest trigger.
- Keep the adapter thin, as the design says, so a switch stays cheap before task 001 merges.

If the user wants zero snapshot risk, A is the safer pick today, and nothing in this spike contradicts that.

## Residual risks

1. **Snapshot churn.** There is no release date. Each snapshot can change registries, recipes, or save data, and the open registry and save-migration work could break worlds between snapshots.
2. **Mod interaction.** The only tested combination was GTM plus `spark`. The documented crashes mostly involve other mods (JEI, EMI, Balm, Create add-ons), so the real pack is untested.
3. **Client side is unknown.** UI, preview, bloom, and recipe-viewer bugs fill the tracker and none were exercised.
4. **Early-game power.** The solid boiler report (#5447) touches the first steam stage. Reproduce it before committing to B.
5. **Network and registry crashes on a live server** (#5462, #5371) need a connected player to rule out.
6. **Version drift on our side.** I used NeoForge 21.1.264, newer than GTM's 21.1.248 build target. It worked, but the pack should pin whichever pair the playthrough uses.
