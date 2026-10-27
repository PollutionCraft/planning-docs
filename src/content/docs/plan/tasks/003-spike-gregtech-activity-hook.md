---
title: "003: Spike: GregTech machine activity hook"
status: proposed
owner: Heimdall
---

**Alpha status (user, 2026-10-27):** GregTech machines emit in the alpha, so the adapter (012) is committed, not conditional. 012 is built last, after all vanilla emitters (031, 029, 032). This spike can still run earlier, in parallel with P2, to retire the hook risk (architecture R2) before 012. If it finds no workable hook, return to the user with the fallbacks in R2.

**Blocked by:** task [001](../001-mod-scaffold-and-ci/). GTM is in the pack at a pinned build ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/)).

A timeboxed spike: the code is throwaway and is never merged. The deliverable is a findings note. Architecture risk R2.

## Goal

Answer, with evidence from running code against the **pinned GTM snapshot** `8.0.0-SNAPSHOT+20261017-095459-36a6b38` on NeoForge 21.1.264 ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/)):

1. How does our mod reliably tell that a GTM machine is actively working? Cover single-block machines and multiblocks (for example via the muffler hatch). Prefer events or callbacks over polling every machine.
2. What does that approach cost with 100 active machines? Measure with `spark`.
3. Can the hook live in an optional integration package that only loads when GTM is present, so the core mod still runs without GTM? ([Feasibility, adapters](../../feasibility/#adapters-to-other-mods-post-alpha-seam))
4. **Version gate:** can the adapter read the loaded GTM version and stay inactive outside a configured supported range, logging once? Show it with the pinned snapshot (active) and with an out-of-range version, for example GTM 7.0.2, or a faked range (inactive, one log line, core still runs).

5. **No build dependency, integration ladder ([ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/), accepted):** rung 1 (data mapping) is already ruled out for single-block machines: `javap` on the pinned jar shows `MetaMachineBlock` has no activity block state (`active` is a model property), and only `ActiveBlock` casings toggle a real `active`. Prove **rung 2**: a `@Pseudo @Mixin(targets = "com.gregtechceu.gtceu.api.machine.trait.recipe.RecipeLogic", remap = false)` injecting at `RETURN` of `setStatus(RecipeLogic$Status)`, handler taking only `CallbackInfo`, `@Shadow`ing `isWorking()`, `getBlockPos()`, `getLevel()`, **with GTM absent from the compile classpath**, gated by a mixin config plugin on `LoadingModList` and the GTM version. Check: it compiles and applies; `setStatus` fires server-side on every transition, for single blocks and multiblock controllers; shadowing the superclass members `getBlockPos()`/`getLevel()` works; no refmap is needed; the hook is a no-op (no crash) with GTM absent and with an out-of-range version; and measure question 2 with it. Only if rung 2 fails: say why, check rung 3, then show rung 4 (reflection).

Already answered by design, so not in scope: GTM's environmental-hazard system is kept off (`environmentalHazards = false`, [ADR 0005](../../../design/decisions/0005-custom-mod-vs-existing-mods/)).

Feeds requirement M1 and task 012.

## Design references

- [Architecture 3.3, Emission](../../../design/architecture/#33-key-flows), and the fallbacks in risk R2: muffler-only emission, or the config-driven block-state emitter.

## Files owned

Spike branch `spike/003-gt-activity` in the mod repo (not merged). Heimdall files the findings note in this docs repo.

## Deliverable

A findings note covering:

- the API entry points used (class and method, GTM version), and the integration-ladder evidence: which rung was reached and why earlier rungs failed
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
