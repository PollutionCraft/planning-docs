---
title: "ADR 0007: Tech tree structure and candidate mod lists"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 for the **structure**: GregTech-led. The mod list, the balance between mods, and the cutoff stage are still open; they are future work and not needed for the alpha.
- **Context:** M6 needs gated tiers. M7 needs a cutoff that sits on a clear tier boundary. Every machine mod needs an emitter mapping, or it becomes a pollution-free loophole (goal 4). The user wants other tech mods to be addable.

## Options

| Option | Spine | For | Against |
| --- | --- | --- | --- |
| **A. GregTech-led** | GTM voltage tiers | Built-in gating; numeric tiers (cutoff candidate HV/EV); one main adapter | Steep; GTM 1.21.1 is a pinned snapshot until 8.0 ships ([ADR 0001](../0001-minecraft-version-and-loader/), accepted: 1.21.1 NeoForge) |
| B. Create-led, then GT | Create → GTM | Gentler start | Create would be the primary tree |
| C. No GregTech | Mekanism / IE / Modern Industrialization | Frees the version choice | Loses the thematic fit |

## Decision

**A. GregTech is the primary tree.**

- **Create** may be included, but **not as the primary tree**. It fits as a side mechanical option.
- **Other tech mods must be addable.** Balancing them against the GT tiers (recipe gating via KubeJS, emission rates per mod) is **future work**.
- The integration route for each mod is set in [ADR 0005](../0005-custom-mod-vs-existing-mods/): data-driven emitters first, code adapters as isolated packages in core for the alpha, moving to the compat mod later.
- **The user's view:** GregTech is not strictly required, but it is a strong thematic fit.
- **Fallback if GregTech is dropped:** an alternative primary tree is needed. The candidate is **Modern Industrialization** (GT-like tiers; available on 1.21.1 NeoForge, our accepted platform). The second choice is **Mekanism** (tiered machines on both targets).
- **Cutoff stage (brief, open question 2):** still open. Proposal: HV. Decide after the alpha.

## Candidate mods (availability checked 2026-10-20)

| Mod | 1.20.1 Forge (fallback only) | **1.21.1 NeoForge (our platform)** | Role | Integration |
| --- | --- | --- | --- | --- |
| GregTech CEu Modern | 7.5.3 | 7.0.2 (8.0 snapshot) | Primary tree | Code adapter (spike 003) |
| Create | 6.0.8 | 6.0.10 | Optional side tree | Data-driven where possible |
| Mekanism | 10.4.16 | 10.7.19 | Optional | To assess |
| AE2 | 15.4.11 | 19.2.18 | Logistics. AE2 consumes energy rather than "running recipes", so whether and how it emits is a design question. | To assess |
| Immersive Engineering | 10.2.0 | 12.4.2 | Optional | To assess |
| Thermal Expansion | 11.0.1 (2024) | **none** | — | **Removed as a target** (user, 2026-10-20); stalled upstream |
| IC2 Classic / Experimental | **none** | **none** | — | **Removed as a target** (user, 2026-10-20); only unofficial remakes |
| KubeJS | 2001.6.5 | 2101.7.2 | Gating and recipes; can call the Emitter API | — |

## Consequences

- The pack's identity is "GregTech with consequences".
- Each added mod costs an emitter mapping and balance work.

## Blast radius / reversibility

The mod list and recipe scripts only. The core design is the same for every tree.

## Revisit if

- The user drops GregTech, or ADR 0001 falls back to 1.20.1 Forge (then re-check the mod list).
- Spike 003 makes GTM integration impractical.
- Thermal or IC2 gets an official build on our target (they could then return as targets).
- **Open:** substitutes for Thermal and IC2 (user; [architecture §9](../../architecture/#9-questions-for-the-user) Q3).
