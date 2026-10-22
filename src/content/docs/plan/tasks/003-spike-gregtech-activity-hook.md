---
title: "003: Spike: GregTech machine activity hook"
status: proposed
owner: Heimdall
---

**Blocked by:** task [001](../001-mod-scaffold-and-ci/). GTM is in the pack at a pinned build ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/)).

A timeboxed spike: the code is throwaway and is never merged. The deliverable is a findings note. Architecture risk R2.

## Goal

Answer, with evidence from running code against the **pinned GTM snapshot** `8.0.0-SNAPSHOT+20261017-095459-36a6b38` on NeoForge 21.1.264 ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/)):

1. How does our mod reliably tell that a GTM machine is actively working? Cover single-block machines and multiblocks (for example via the muffler hatch). Prefer events or callbacks over polling every machine.
2. What does that approach cost with 100 active machines? Measure with `spark`.
3. Can the hook live in an optional integration package that only loads when GTM is present, so the core mod still runs without GTM? ([Feasibility, adapters](../../feasibility/#adapters-to-other-mods-post-alpha-seam))
4. **Version gate:** can the adapter read the loaded GTM version and stay inactive outside a configured supported range, logging once? Show it with the pinned snapshot (active) and with an out-of-range version, for example GTM 7.0.2, or a faked range (inactive, one log line, core still runs).

Already answered by design, so not in scope: GTM's environmental-hazard system is kept off (`environmentalHazards = false`, [ADR 0005](../../../design/decisions/0005-custom-mod-vs-existing-mods/)).

Feeds requirement M1 and task 012.

## Design references

- [Architecture 3.3, Emission](../../../design/architecture/#33-key-flows), and the fallbacks in risk R2: muffler-only emission, or the config-driven block-state emitter.

## Files owned

Spike branch `spike/003-gt-activity` in the mod repo (not merged). Heimdall files the findings note in this docs repo.

## Deliverable

A findings note covering:

- the API entry points used (class and method, GTM version)
- a sample snippet
- the measured cost
- whether optional loading works
- whether the version gate works, and how the GTM version is read
- a recommendation: a GTM hook, muffler-only, or a config-driven fallback
- open risks

## Commands

`./gradlew runClient` for exploration. `./gradlew runGameTestServer` if a probe GameTest is written.

## Timebox and out of scope

One working session. Out of scope: production code, adapters for other mods, and pollution logic.
