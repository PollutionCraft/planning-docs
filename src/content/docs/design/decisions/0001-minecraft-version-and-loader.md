---
title: "ADR 0001: Minecraft version and modloader"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-22 by the user: **Minecraft 1.21.1 on NeoForge** with GregTech CEu Modern (GTM) 8.0.0 snapshot builds. This follows spike [006](../../../plan/tasks/006-spike-gtm-1-21-readiness/) ([findings](../../../plan/tasks/006-findings/)) and the user's manual validation of the GTM 8.0.0 snapshot in Prism.
- **Context:** The brief assumed "modern MC + GregTech forces 1.20.1 Forge". That is partly wrong: GregTech allows 1.20.1 Forge or 1.21.1 NeoForge ([architecture 2.1](../../architecture/#21-gregtech-and-loaders-version-question)). Everything else depends on this choice: the scaffold (task 001), the pack, the Java version, the mod list, and the artifact names.

## Facts

From the GitHub and Modrinth APIs (2026-10-20) and spike 006:

| Item | Detail |
| --- | --- |
| GTM 1.20.1 Forge | Default branch. Numbered releases through v7.5.3 (2026-04-12). |
| GTM 1.21.1 NeoForge | Active branch, roughly monthly forward-ports from 1.20.1. Rolling `latest-1.21` snapshot labelled 8.0.0. **The last numbered release is v7.0.2 (2025-07-20).** **No 8.0 release date or maintainer estimate**; tracking issue [#4789](https://github.com/GregTechCEu/GregTech-Modern/issues/4789) still has unchecked items. |
| GTM 26.x, Fabric | Not viable (no releases). |
| Spike 006, 1.21.1 target | `8.0.0-SNAPSHOT+20261017-095459-36a6b38` on NeoForge 21.1.264 (GTM builds against 21.1.248, requires `[21.1,)`), Temurin 21. Boots with **0 errors**, idle MSPT 0.1–0.2 ms, and a single-block machine and the coke oven multiblock both completed recipes. Tested with GTM + `spark` only, no client. |
| Integration targets | Create, Mekanism, AE2, IE: available on 1.21.1 NeoForge. Thermal and IC2: no official build ([ADR 0007](../0007-tech-tree-and-mod-list/)). |

## Options

| Option | Outcome |
| --- | --- |
| **B. 1.21.1 NeoForge + GTM 8.0 snapshot** | **Chosen.** NeoForge's most popular version, where new development happens. Longer useful life for a pack started in late 2026. Spike 006 passed R4. |
| A. 1.20.1 Forge + GTM 7.5.x | **Rejected; kept as the fallback.** GTM's most-released target and the lowest snapshot risk. But it is a frozen platform, Forge is in legacy mode (per secondary sources), and a later port would cost effort. Thermal's only build is 1.20.1 (a 2024 file), which is not enough to tip the choice. |
| C. 26.x | Rejected: no GTM. |
| D. Drop GregTech (for example Modern Industrialization) | Rejected for now: GregTech is the preferred primary tree ([ADR 0007](../0007-tech-tree-and-mod-list/)). |

## Decision

**1.21.1 NeoForge.**

| Item | Value |
| --- | --- |
| Minecraft | **1.21.1** |
| Loader | **NeoForge 21.1.x**. Pin the exact build the pack uses (currently 21.1.264). Update it deliberately. |
| Java | **21** |
| GTM | **8.0.0 snapshot, pinned by exact build and hash**, currently `8.0.0-SNAPSHOT+20261017-095459-36a6b38`. Snapshots are updated on purpose, never automatically. The pack re-hosts the pinned jar because the `latest-1.21` URL is rolling (pack task 025). |
| Artifact suffix `<mc>` | `1.21.1`, for example `pollutioncraft-1.21.1` ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/)) |

### GTM version gate

The GTM adapter (in core's `…compat.gtceu` during the alpha, later in compat):
- activates only when the loaded GTM version is within a configured supported range (initially the 8.0.0 snapshot line);
- otherwise logs once and stays inactive, so core keeps running.

This also covers players who install GTM 7.0.2 from the platforms ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/) §8.1).

## Risks accepted with this choice (from spike 006)

| Risk | Detail |
| --- | --- |
| [#5293](https://github.com/GregTechCEu/GregTech-Modern/issues/5293) | Startup crash on the snapshot together with several other mods. **The likeliest trigger for falling back.** The pack CI smoke test catches it on every mod addition. |
| [#5447](https://github.com/GregTechCEu/GregTech-Modern/issues/5447) | Solid boilers don't burn fuel on 1.21.1 v8. Hits early steam power. Reproduce it before relying on steam in progression. |
| No 8.0 release date | Snapshot churn may change registries, recipes, or save data between snapshots. Bumping a snapshot needs a pack smoke test and a world-load check. |
| Untested ground | Client side, mod interactions, and network crashes (#5462, #5371) were not covered by spike 006. |

**Fall back to A (1.20.1 Forge)** if any of these hold:
- #5293-class crashes block the pack's mod list;
- the boiler issue blocks early progression with no workaround;
- snapshot churn breaks worlds repeatedly.

The switch is cheap before P1 adapter code exists, and the plain-Java `core` is unaffected either way.

## Consequences

**Benefits:**
- A modern platform.
- One loader, so no multi-loader build.

**Costs:**
- Snapshot dependency until GTM 8.0 ships.
- GTM is not available on the platforms at the version we need, which affects public releases (ADR 0011 §8.1).

## Blast radius / reversibility

The adapter layer, the pack, the mod list, and artifact names. Cheap to reverse before P1 adapter code; expensive after P1–P3.

## Revisit if

- GTM 8.0 ships for 1.21.1: move the pin to the numbered release.
- A fallback trigger above fires.
- GTM makes a 26.x release.
- The user drops GregTech.
