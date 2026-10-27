---
title: "033: With-targets GameTest job (CI)"
status: proposed
owner: Heimdall
---

**Blocked by:** nothing (spike 003 showed the headless approach works locally). **Blocks:** task [012](../012-gtm-activity-adapter/) (code, not its design gate). **Origin:** [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/) (the job is mandatory for any Mixin or reflection adapter), the follow-up listed in [architecture §10](../../../design/architecture/#10-alignment-with-engineerings-docs-for-heimdall) item 5, and [003 findings](../003-findings/#recommendation-for-012). Separate task because it is CI and Gradle work, reviewed on its own, and 012 cannot be trusted without it: a missed `require = 0` injection is silent.

**Not verified by me:** whether any part of this job already exists. Task 001 added `verifyNoTargetModsOnClasspath` and the spike put GTM into a run's `mods/` folder by hand; the CI job itself is not recorded as done on any page I read. Heimdall confirms the starting state in the first step.

## Goal

A CI job and a local Gradle task that run the GameTests **with the target mods present**, taking the jars from the **pack's pinned versions**, hash-checked, and never from a build dependency.

## Behaviour

- **Source of the jars:** the pack repo's `mods/*.pw.toml` pins (URL and hash). The job downloads each target jar, checks the SHA-256 against the pin, and fails on a mismatch. First target: GTM (`gtceu`). Others later (task 027 and onward).
- **Placement:** the jars are copied into the GameTest server's `run/…/mods/` folder only. They are never on a compile or test classpath ([ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/); `verifyNoTargetModsOnClasspath` stays green).
- **Selection:** a separate GameTest namespace or batch for with-targets tests (for example `compat_gtceu`), run only by this job. The default `runGameTestServer` stays free of targets and passes without them.
- **The job must fail if the expected target is not loaded.** The check is part of the job: a test (or a task step) asserts that the target mod id is present in the loaded mod list and fails if not. The spike's probes passed silently without GTM; this job must not.
- **Triggers:** on pull requests that touch `…compat.*`, mixin config, the mod's GTM version constant or the job itself; on `main`; and nightly. Pull requests from forks do not run it with secrets (it needs none; the pin URLs are public).
- **Local task:** `./gradlew runGameTestServerWithTargets` (name by Heimdall) fetches or reuses a cached, hash-checked jar and runs the same selection, so a developer can reproduce CI.
- **Version input:** the GTM jar can be overridden by a Gradle property pointing at a candidate jar, for the pin-bump procedure in [ADR 0016](../../../design/decisions/0016-gtm-activity-hook-shape/) decision 6.
- **A canary test:** a with-targets test that asserts "GTM loaded and its version is in the mod's supported set" and fails with a clear message if not. (012 adds the hook tests; 033 proves the plumbing only.)

## Design references

- [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/), [ADR 0016](../../../design/decisions/0016-gtm-activity-hook-shape/), [architecture 4 testing](../../../design/architecture/#4-conventions)
- [Task 025](../025-pack-release-pipeline/) (the pack's pins and tooling)

## Files owned

The mod repo's CI workflow, `mod/build.gradle` (the with-targets task and the download/hash step), and the canary test. No production code and no pack-repo change. If the job needs a machine-readable list of pins from the pack repo, ask for it and stop; do not parse around it.

## Conditions

- A failing run before each piece is implemented, pasted in the report: the canary fails with no jar, fails with a wrong hash, and fails with the mod absent.
- The job's time is reported; with-targets runs must not push the default CI step past its budget (Heimdall's 3-minute line from 031).
- Pin the download tooling the way task 025 pins its tooling.

## Tests to write first

1. The task fails with a clear message when the jar is missing, when the hash mismatches, and when the target is not in the loaded mod list.
2. The task passes with the pinned GTM jar and the canary green.
3. The default `runGameTestServer` still passes with no target mods present.
4. `verifyNoTargetModsOnClasspath` stays green.

## Commands

`./gradlew build runGameTestServer` and the new with-targets task.

## Out of scope

The GTM hook and its tests (012), other target mods, publishing, and any change to the pack repo.
