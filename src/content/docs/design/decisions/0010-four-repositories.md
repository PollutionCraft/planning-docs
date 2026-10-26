---
title: "ADR 0010: Four separate repositories"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user. It **supersedes one part of [ADR 0005](../0005-custom-mod-vs-existing-mods/)**: "one repository, multi-project build". The rest of ADR 0005 stays accepted: the three-mod target, the two-mod alpha, the dependency direction, and the adapter rule. **Amended by [ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/):** the gap-filler repo has no dependency on core, and compat integrates it.
- **Context:** ADR 0005 put the three mods in one repo. The user prefers each deliverable in its own repo, next to the modpack repo that already exists. How the repos share code and versions is designed in [ADR 0011](../0011-cross-repo-artifacts-and-versioning/).

## Options

| Option | Prior art | For | Against |
| --- | --- | --- | --- |
| One repo, multi-project build (ADR 0005 as written) | Many mod families build several jars from one repo | One CI, atomic cross-mod changes, no published API needed | Couples release cadence and history. Access and issues are mixed. |
| **Four repos: core mod, compat mod, gap-filler mod, modpack** | GTM and its addons are separate repos that consume GTM from a Maven repository (the GTM README documents `maven.gtceu.com`) | Independent history, issues, CI, and releases. Each repo has a clear owner and licence. Forces a real public API. | Needs a published, versioned mod jar with a defined `…api.*` contract, version-range discipline, and cross-repo release coordination (ADR 0011) |

## Decision

**Four repositories** (names provisional):

| Repo | Contents | Licence ([ADR 0009](../0009-licensing/)) |
| --- | --- | --- |
| `pollutioncraft` (core mod) | The plain-Java `core` library as an **internal** subproject, and the core mod. It publishes **one** artifact: the full mod jar, which contains the `…api.*` packages ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/) §1). During the alpha, also the GTM adapter as an isolated package. | LGPL-3.0 |
| `pollutioncraft-compat` | Code adapters, one package per target mod | LGPL-3.0 |
| `pollutioncraft-content` (gap-filler; neutral name to be chosen) | New mobs and missing content. A standalone tech mod with **no core dependency** ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)). | LGPL-3.0 |
| modpack (exists) | packwiz pack, configs, CI, releases | MIT |

**Which repos exist at the alpha: resolved (user confirmed, 2026-10-22).**
- **Only the core-mod repo and the pack repo.**
- Create the compat repo when compat splits out (ADR 0005 trigger: a second code adapter, or GTM updates forcing core releases).
- Create the gap-filler repo when content work starts (post-alpha).
- Until then, the GTM adapter stays a package inside core.

## Consequences

- Cross-repo work needs a published, versioned API and coordinated releases ([ADR 0011](../0011-cross-repo-artifacts-and-versioning/)).
- A change that spans core and compat becomes two PRs and a release in between.
- The adapter rule (API-only, own package) matters even more: moving `…compat.gtceu` out of core becomes a copy into a new repo plus a dependency on core's published mod jar, with build checks limiting imports to `…api.*`.

## Blast radius / reversibility

Repo creation, CI, and release processes. Merging repos later is possible but loses separate histories unless done carefully; moderate cost.

## Revisit if

- Cross-repo coordination becomes the main source of friction, for example frequent lockstep releases.
