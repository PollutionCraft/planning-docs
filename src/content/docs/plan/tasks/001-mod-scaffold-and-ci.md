---
title: "001: Core mod scaffold, test harness, CI"
status: accepted
owner: Heimdall
---

**Done: accepted with conditions (2026-10-22).** Commands and tests pass locally and in CI, per the engineer reports and the CI runs cited by the lead (not re-run by project-owner). CI runs: [green](https://github.com/PollutionCraft/pollutioncraft/actions/runs/39819937840) on `feature/001-mod-scaffold-and-ci`, [red](https://github.com/PollutionCraft/pollutioncraft/actions/runs/39822111960) on a deliberately failing GameTest. Open conditions:

1. **GTM hash unconfirmed.** `057f8e97…1011` is the hash of Maven snapshot `20261017.095456-124`: same commit `36a6b38` as the pin above, timestamp 3 s off. Compare it with the pack's `mods/gtceu.pw.toml` once the pack repo has one (tasks 025/002). If it differs, re-host and update `gradle.properties`.
2. **Package name and licence ID** rest on ADR 0013 and ADR 0014, both still `proposed`. A package rename is a mechanical change; do it before task 005 if ADR 0013 changes.
3. **Transitive GTM dependencies** are not hash-pinned individually (GTM is resolved non-transitively and its jar-in-jar covers runtime). Decide in task 025/022 whether the pack pin must cover them.

**Follow-up change ([ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/), accepted 2026-10-22):** GTM leaves this repo's build entirely: no `compileOnly`, no `gtmRuntime`, no GTCEu repository, no `verifyGtmHash`/`gtceu_sha256`, no catalog entry. The pack is the only GTM pin. That **dissolves condition 1** (one pin, in the pack) and **condition 3 is resolved by the user**: GTM's transitive dependencies are not pinned. `gtceu` stays `optional` in `neoforge.mods.toml`. `runGameTestServer` is unchanged (already GTM-free); a separate with-targets GameTest job is added. New build checks: no target mod on the compile classpath; `@Mixin` classes only in `…compat.<modid>.mixin` and observe-only (`@Pseudo`, string targets, `remap = false`, no `@Overwrite`/`@Redirect`/`@Modify*`, never `cancellable`); reflection only in `…compat.*`; the adapter-import check also allows `…compat.common`. The "No Mixins in this task" line below stays true for 001: Mixins arrive with task 012 under ADR 0015's integration ladder. Allowed build dependencies are only internal artifacts, Minecraft modding requirements (Minecraft, NeoForge/FML, MDG, Parchment, Mixin/MixinExtras), and generic Java utilities (e.g. Apache Commons, Lombok, Jackson, JUnit, ArchUnit). The with-targets CI job may download the pack's pinned target jars. Engineering-lead briefs the follow-up now; until it merges, the build below is what exists.

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

All files in the **core-mod repository** (its own repo, per ADR 0010): Gradle build and wrapper, `src/main`, `src/test`, game-test sources, CI workflow, `README.md`, `LICENSE` (LGPL-3.0 per [ADR 0009](../../../design/decisions/0009-licensing/); ship the GPL-3.0 text that LGPL-3.0 builds on, as well). SPDX id in metadata: `LGPL-3.0-only` ([ADR 0014](../../../design/decisions/0014-licence-spdx-id/)).

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

- Base package and Maven group `io.github.pollutioncraft` ([ADR 0013](../../../design/decisions/0013-java-package-namespace/)); `…` in the table above stands for it. Mod id `pollutioncraft` (provisional). Parchment mappings where available.
- **Platform** (ADR 0001):
  - Minecraft 1.21.1, NeoForge 21.1.x pinned to **21.1.264** (the pack's build), Java 21 toolchain.
  - Build with NeoForge's Gradle tooling (ModDevGradle), not ForgeGradle.
  - Bump the NeoForge pin only on purpose.
- **GTM dependency** (*superseded by [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/), accepted: removed from the build in the follow-up*): add GregTech CEu Modern at the pinned snapshot build `8.0.0-SNAPSHOT+20261017-095459-36a6b38`, verified by hash, as a dev runtime and compile dependency of `mod` only (the `…compat.gtceu` adapter needs it). Never `latest-1.21`.
  - Source: the jar re-hosted by pack task 025, or GTM's Maven if it serves that exact build.
  - Mark it optional in the mod metadata: core must load without GTM.
- No Mixins in this task. (Under [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/), accepted, Mixins become rung 2 of the integration ladder from task 012 on; core itself never has Mixins.)

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
