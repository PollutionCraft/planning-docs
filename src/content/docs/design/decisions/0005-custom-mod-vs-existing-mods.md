---
title: "ADR 0005: Custom mods, mod split, and where adapters live"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user. **The "one repository, multi-project build" part is superseded by [ADR 0010](../0010-four-repositories/)** (four separate repos). The three-mod target, the two-mod alpha, the dependency direction, and the adapter rule remain accepted. **The gap-filler's dependency on core, and its siege tags, are amended by [ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)**: the gap-filler depends on nothing, and compat is the single integration layer. **Accepted 2026-10-22: [ADR 0015](../0015-compat-without-build-dependencies-on-target-mods/)** would make adapters reach target mods with no build-time dependency, through an ordered integration ladder (data mapping → observe-only Mixin → other options → reflection last), and adds clauses to the adapter rule.
- **Context:**
  - **Custom code is needed.** No existing mod links pollution to mobs attacking its source. The prior art checked: GTM hazards, Pollution of the Realms, Create: Smog, Improved Mobs, and digging-mob mods ([architecture 2](../../architecture/#2-prior-art)).
  - **The user wants 2, maybe 3 mods:**
    1. A core pollution mod: generation, spread, absorption, mob behaviour, plus adapters so GregTech, Thermal, IC2, AE2, and others produce pollution.
    2. A gap-filler mod for the tech tree: new mobs and anything no existing mod provides.
  - Open sub-questions: should the adapters live in core or in separate modules, and is a third mod warranted?

## What we still build vs adopt

**No change from the earlier version:** we build our own pollution model and siege AI. We borrow designs from Factorio, GTNH, GTM, Create: Smog, and Improved Mobs. GTM's `environmentalHazards` stays off, and no second pollution or mob-AI mod ships in the pack. Reasons: we need source-aware targeting, two owners of mob AI would conflict, and several candidates are ARR-licensed. **Fallback:** if spike 004 fails, re-evaluate reusing Improved Mobs for block breaking.

## Where adapters live: options

| Option | Prior art | For | Against |
| --- | --- | --- | --- |
| **A. Inside the core mod**, as optional packages loaded only when the target mod is present | Common; many mods bundle optional compat (for example Jade plugins) | One jar, simple install | Core's build needs every target mod's API. Any target-mod update can force a core release. An adapter bug can crash core. Core's release cadence is tied to N other mods. |
| **B. One separate compat mod**, with one source set per target mod | Common split: "X" + "X Compat" | Core stays small and stable. Compat can ship on its own schedule when GTM or AE2 change. ~~Packs can leave it out.~~ *Amended by [ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/): compat is required for our pack.* It forces a clean public API. | One more jar and release pipeline; API versioning discipline |
| **C. One jar per target mod** | Some large mod families do this | The finest isolation | N pipelines; heavy for a small team |
| **D. Data-only** (config or datapack emitters, no code) | Create: Smog's block→rate config | Zero code per mod. Works for any machine that exposes an `active`/`lit` block-state property. | Can't see activity that only lives in block-entity state (likely for GT recipe logic, per spike 003) |

## Is a third mod warranted?

Yes, but not for the alpha. The three concerns change for different reasons:
- The **core** changes when the pollution rules change.
- **Compat** changes when *other* mods update.
- **Content** (new mobs and items) changes with tech-tree design.

Putting compat into the gap-filler mod would tie integration releases to content work, and content work is out of the alpha. Putting compat into core gives the cons of option A.

## Decision

**Target state: three mods.** ~~Built from one repository with a multi-project build.~~ *Superseded: each mod has its own repo ([ADR 0010](../0010-four-repositories/)), and they share core's API as a published artifact ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/)).*

| Mod | Contents | Ships |
| --- | --- | --- |
| **`pollutioncraft`** (core) | `core` formulas; storage; scheduler; public API; **data-driven emitters (option D)**; absorption; siege AI and siege groups; commands; config. **In the alpha it also contains the GTM adapter as an isolated package.** | Alpha |
| **`pollutioncraft_compat`** | Code adapters (option B), one package per target mod | **Not in the alpha.** It splits out of core when a second code adapter appears, or when GTM updates start forcing core releases (whichever comes first). |
| **`pollutioncraft_content`** (gap-filler; neutral name to be chosen) | New mobs, items, and blocks no existing mod provides. ~~They join sieges via the public tag.~~ *Amended ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)): no pollution code or tags; compat integrates it.* | Post-alpha |

**The alpha ships two artifacts:** core, with the GTM adapter inside it, and the pack. That makes it option A now, and option B later.

**Adapter rule, from day one,** so the split stays cheap ([architecture 4](../../architecture/#4-conventions)):
- Each adapter has its own package (`…compat.<modid>`).
- It loads only after a `ModList` presence check, and no class in it is referenced before that check.
- It uses the public API only, never core internals.
- Core starts and passes its tests with no target mod installed.
- *Additions (accepted, [ADR 0015](../0015-compat-without-build-dependencies-on-target-mods/)):* no target mod on any compile classpath; ladder evidence recorded per adapter; Mixins observe-only and confined to `…compat.<modid>.mixin`; reflection only as the last rung, confined to `…compat.*`; every hook covered by a with-targets GameTest.

Splitting compat out is then a move of packages into the compat repo, which depends on core's published API ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/)), with no code changes.

**Dependency direction:**

```
(amended by ADR 0012)
pollutioncraft_compat ──► pollutioncraft (core) ──► (nothing)
        │
        ├──► target mods, each optional (e.g. GTM)
        └──► gap-filler (optional)          gap-filler ──► (nothing)
```

| Mod | Depends on | Runs standalone? |
| --- | --- | --- |
| core | nothing; never imports compat or content | Yes |
| compat | core, importing only `…api.*` (hard) and each target mod (optional, per adapter), **including the gap-filler** ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)) | No, needs core |
| gap-filler | ~~core (hard; its mobs join sieges via the `pollutioncraft:siege_eligible` tag)~~ **nothing** ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)) | **Yes**; reusable in other packs |

**Adapters are loader- and version-specific.** Only `core` (pure Java) is version-independent. [ADR 0001](../0001-minecraft-version-and-loader/) picks one version and loader, so there is no multi-loader build.

**Licences:** LGPL-3.0 for the mods, MIT for the pack repo. See [ADR 0009](../0009-licensing/).

**Note on the named targets:** Thermal Expansion has only a 2024 1.20.1 build, and IC2 has no official build for either target ([architecture 2.1](../../architecture/#21-gregtech-and-loaders-version-question)). The user has removed both as integration targets; substitutes are open ([ADR 0007](../0007-tech-tree-and-mod-list/)).

## Consequences

**Benefits:**
- One artifact to ship in the alpha.
- Clean seams for later.
- ~~The gap-filler mod has a clear contract: the public API plus tags.~~ *Amended ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)): the gap-filler is independent; compat is the contract point.*

**Costs:**
- Until the split, a GTM API change can force a core release. That is the split trigger.
- We must keep the public API compatible from day one (semantic versioning; dependents declare version ranges).

## Blast radius / reversibility

This sets the mod structure (task 001); the repo layout is now [ADR 0010](../0010-four-repositories/). The split is cheap because of the adapter rule. Reversing to a fully merged mod is also cheap.

## Revisit if

- A second code adapter is written, or a GTM update forces a core release: split out compat.
- Gap-filler content starts (post-alpha): create the third project.
- A target mod ships its own integration using our API.
