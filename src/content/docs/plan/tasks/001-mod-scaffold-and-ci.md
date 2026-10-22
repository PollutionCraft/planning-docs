---
title: "001: Core mod scaffold, test harness, CI"
status: proposed
owner: Heimdall
---

**Not blocked.** [ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/) is accepted: Minecraft 1.21.1, NeoForge 21.1.x, Java 21.

## Goal

The core-mod repo `pollutioncraft` (provisional name): an empty but buildable core pollution mod with both test layers running in CI. Every later task then starts test-first.

Acceptance criteria satisfied: none directly. Enables testing of M1–M4 ([feasibility, section 5](../../feasibility/#5-testability-of-the-alpha-acceptance-criteria)).

## Design references

- [Architecture 3.1](../../../design/architecture/#31-components): `core` (plain Java) and platform adapter
- [Architecture 4](../../../design/architecture/#4-conventions): conventions
- [ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/) (accepted): version, loader, Java, GTM pin, artifact suffix
- [ADR 0005](../../../design/decisions/0005-custom-mod-vs-existing-mods/) (accepted): mod split, adapter rule
- [ADR 0009](../../../design/decisions/0009-licensing/) (accepted): licences
- [ADR 0010](../../../design/decisions/0010-four-repositories/) (accepted): four repositories; this one is the core-mod repo
- [ADR 0011](../../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §1 (decided): one published artifact per repo, plus versioning. Only the layout and checks are used here; publishing waits for task 026.

## Files owned

All files in the **core-mod repository** (its own repo, per ADR 0010): Gradle build and wrapper, `src/main`, `src/test`, game-test sources, CI workflow, `README.md`, `LICENSE` (LGPL-3.0 per [ADR 0009](../../../design/decisions/0009-licensing/); ship the GPL-3.0 text that LGPL-3.0 builds on, as well).

Layout: a Gradle multi-project build with three subprojects (ADR 0010, ADR 0011):

| Subproject or source set | Contents | Packages | May reference |
| --- | --- | --- | --- |
| **`core`** | Plain-Java formulas | `…pollutioncraft.core.*` | JDK only |
| **`api`** | Public contract: interfaces, value types, tag-id constants, events. Uses Minecraft types. | `…pollutioncraft.api.*` | Minecraft, NeoForge, JDK. **Nothing of ours outside `…api.*`.** |
| **`mod`** | Loader entry point, everything platform-side, and the in-core `…compat.*` packages | `…pollutioncraft.mod.*`, `…compat.*` | everything above |

**All three are bundled into ONE jar, `pollutioncraft-1.21.1`.** It is the only artifact this repo publishes (ADR 0011 §1; a separate API artifact is a later revisit, not now). Sources come as the standard sources attachment, not as a second artifact. `core` and `api` are structure only: never published separately, and no `pollutioncraft-api` artifact or classifier jar. Choose subprojects or source sets, whichever bundles most simply into the one jar, and record the choice in the README. Task 026 then adds `maven-publish` for that single jar with no restructuring.

The gap-filler does not depend on core ([ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/)). Third parties and, later, compat compile against this jar and may import only `…api.*`; the build checks below enforce that, since the compiler cannot.

The compat and gap-filler mods live in their own repos (tasks 027 and 028), not here.

Build checks to add (ArchUnit or equivalent, run by `./gradlew build`):

1. **Core purity:** `…core.*` references no Minecraft or loader classes.
2. **API purity:** `…api.*` references only Minecraft, NeoForge, and the JDK. It never references `…core.*`, `…mod.*`, any other non-API package of ours, or `…compat.*`. This keeps the public surface self-contained, so splitting it out later is a move.
3. **Compat isolation:** nothing in `mod` references `…compat.*` except the single `ModList`-guarded entry point (adapter rule, ADR 0005).
4. **Adapter imports:** classes in `…compat.*` reference only `…pollutioncraft.api.*` packages of ours, plus the target mod and Minecraft/loader. Any other `pollutioncraft` package fails the build. This keeps the later move to the compat repo a copy. No adapters exist yet; task 012 inherits the rule.

## Shared interfaces

Provides the subproject layout and build for tasks 003–024 and 026. Defines no domain interfaces; task 005 does that.

## Conventions

- Mod id `pollutioncraft` (provisional). Parchment mappings where available.
- **Platform** (ADR 0001):
  - Minecraft 1.21.1, NeoForge 21.1.x pinned to **21.1.264** (the pack's build), Java 21 toolchain.
  - Build with NeoForge's Gradle tooling (ModDevGradle), not ForgeGradle.
  - Bump the NeoForge pin only on purpose.
- **GTM dependency:** add GregTech CEu Modern at the pinned snapshot build `8.0.0-SNAPSHOT+20261017-095459-36a6b38`, verified by hash, as a dev runtime and compile dependency of `mod` only (the `…compat.gtceu` adapter needs it). Never `latest-1.21`.
  - Source: the jar re-hosted by pack task 025, or GTM's Maven if it serves that exact build.
  - Mark it optional in the mod metadata: core must load without GTM.
- No Mixins in this task.

## Tests to write first

1. A JUnit 5 test in `core` that fails, then passes. Shows the unit layer runs.
2. A trivial GameTest (place a block, assert it is there). Shows the in-game layer runs headless.
3. Each of the four architecture checks: show it failing once with a deliberate violation, then passing.

## Dev loop (inner loop)

Daily iteration is local. It needs no push, no tag, and no published artifact.

| Purpose | Command |
| --- | --- |
| Dev client or server | `./gradlew runClient` / `./gradlew runServer` |
| Headless GameTests, the same as CI | `./gradlew runGameTestServer` |
| Test in the real pack | `./gradlew deployToDevInstance` (see below) |

**Deliverable of this task:** a small Gradle task, `deployToDevInstance`. It builds the mod jar and copies it into the `mods/` folder of a dev Prism instance.

- **Instance path:** configured per developer, through a Gradle property in `~/.gradle/gradle.properties` (for example `pollutioncraft.devInstance=/path/to/instance`) or an environment variable. Never committed.
- **Older jars:** the task removes previous `pollutioncraft-*.jar` files from that folder first, so two versions never load together.
- **Missing path:** fails with a clear message when no path is configured.
- **README:** document the setup steps.

What this loop does **not** involve:

- The pack repo. The dev instance is the imported pack with our dev jar on top.
- Pinning or hashing. The dev jar is never pinned or hashed. That only happens in the outer loop: tagged release → task 026 publishes to GitHub Packages and a GitHub Release (and to Modrinth/CurseForge once enabled) → the pack pins exact version and hash from a release asset or platform (task 022).

**Convention:** the dev Prism instance is separate from testers' builds. It has its own worlds and servers, which are never shared with testers, and its saves never feed tester reports. Testers only ever get pack releases.

## Commands (all must pass locally and in CI)

- `./gradlew build`: compiles and runs unit tests
- `./gradlew test`: unit tests only
- `./gradlew runGameTestServer`: headless GameTests, with a non-zero exit code on failure
- `./gradlew deployToDevInstance`: verified by hand once (jar copied, old jar removed, clear error without a configured path); not run in CI
- CI runs `./gradlew build runGameTestServer` on every push and pull request.

## Out of scope

Pollution logic, the GTM adapter itself (spike 003 and task 012), the compat and gap-filler repos, pack files (task 002). Publishing, snapshots, the API binary-compatibility check, and releases: task 026.
