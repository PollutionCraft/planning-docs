---
title: "006: Spike: GTM 1.21.1 NeoForge readiness"
status: accepted
owner: Heimdall
---

**Done (2026-10-20). Recommendation adopted:** [ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/) is accepted as 1.21.1 NeoForge with the GTM snapshot pinned. Results: [006 findings](../006-findings/).

Open follow-ups:

- **One-hour playthrough:** the user is doing it.
- **Reproduce [#5447](https://github.com/GregTechCEu/GregTech-Modern/issues/5447)** (solid boilers not burning fuel) before steam progression is relied on. If it blocks early progression with no workaround, it is an ADR 0001 fallback trigger.

This was risk R4 in [architecture section 7](../../../design/architecture/#7-risks-and-unknowns): a timeboxed spike, needing no mod scaffold, whose deliverable is a findings note.

## Goal

Answer, with evidence: is the GregTech CEu Modern `latest-1.21` (8.0.0) snapshot on 1.21.1 NeoForge stable enough to base the alpha pack on? The same checks on GTM 7.5.x for 1.20.1 Forge give a baseline for comparison.

## Steps

For each of the two targets:

1. Set up a dedicated server with the NeoForge or Forge version GTM's build requires, GTM and its required dependencies, and `spark`.
2. Boot it headless and generate a new world. Record: boot success, time to `Done (`, and every `ERROR`/`Exception` line in the log.
3. Run `spark` for 5 minutes idle with a fake or connected player, and record MSPT.
4. Using commands (`/give`, `/setblock`), place and power at least one GTM single-block machine (for example an LV electric furnace) and one multiblock (for example the coke oven or EBF). Run a recipe and record whether it completes.
5. Review the GTM issue tracker and release notes. List open crash or blocker issues labelled for 1.21 and any stated 8.0 release plan or date.

**In progress by the user (2026-10-20):** manual validation of GTM 8.0.0 in Prism; this is the playthrough part of R4. Steps 1–5 add what a manual session doesn't show: dedicated-server behaviour, logs, MSPT, and the issue-tracker review. Steps 1–3 for 1.21.1 can reuse the pack repo (`../pollution-craft`), which already pins the snapshot under test.

## Files owned

None in this repo. Scratch setup only; nothing is committed. Heimdall files the findings note.

## Deliverable

A findings note with one table per target: versions used, boot result, errors, MSPT, recipe results, and open blocker issues with links. End with a recommendation for ADR 0001 (B passes or fails R4) and the residual risks.

## Timebox and out of scope

Half a day. Out of scope: our own mod, other mods in the candidate list, and pack tooling (task 002).
