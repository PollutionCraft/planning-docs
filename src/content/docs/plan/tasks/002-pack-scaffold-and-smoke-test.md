---
title: "002: Pack CI and server smoke test"
status: accepted
owner: Heimdall
---

**Accepted 2026-10-22** (branch `feature/pack-scaffold-and-smoke-test`, commit e050379). Evidence: smoke test green (`Done (`, emi, gtceu, spark loaded, `environmentalHazards: false`); red on an invalid NeoForge version and on a broken-jar crash; `packwiz refresh` leaves no index diff; CI green on GitHub. Verified by Heimdall and the user; I read the reports and did not re-run the tests.

Non-blocking follow-ups: `SMOKE_PORT` (fixed port 25565 for now); a `shellcheck` step in CI; verify the NeoForge installer download by hash. Each is a Heimdall change to `smoke-test.sh` or `ci.yml`. Allowlist note: new mods may need entries for the broad `Exception` pattern.

**Blocked by:** task [025](../025-pack-release-pipeline/) (remote, pinned tooling). The target is the existing pack: Minecraft 1.21.1, NeoForge 21.1.264, GTM `8.0.0-SNAPSHOT+20261017-095459-36a6b38` ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/), accepted).

## Context

The pack repo exists (`../pollution-craft`, packwiz; see task 025 for its state). Its only workflow is the tag-triggered release. Nothing yet checks that the pack actually boots, and nothing runs on ordinary pushes.

## Goal

Every push and pull request to the pack repo proves the pack installs headless and boots a dedicated server. Mod incompatibilities then surface before a release is tagged.

Acceptance criteria satisfied: none directly. Prerequisite for P4 integration and the performance baseline ([feasibility, section 3](../../feasibility/#3-pack-assembly-distribution-and-testing)).

## Design references

- [Feasibility, section 3](../../feasibility/#3-pack-assembly-distribution-and-testing)
- [ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/) (accepted)
- [ADR 0007](../../../design/decisions/0007-tech-tree-and-mod-list/)

## Files owned

In the pack repo:

- `.github/workflows/ci.yml` (new)
- `scripts/smoke-test.sh` (new)
- `config/gtceu*` (the GTM config override)

Not `release.yml` or `README.md`: task 025 owns those. If the README needs a smoke-test section, send it to Heimdall as a follow-up after 025 merges.

## Shared interfaces

None. Task 022 later adds our mods to this pack. The release workflow may call the smoke test later; that change goes to Heimdall.

## Conventions

- Every mod pinned with a hash; nothing unpinned. Use the packwiz version that task 025 pins.
- Our own mods, once added (task 022), are pinned the same way: exact version and hash from the **GitHub Release asset** (or the CurseForge file, or Modrinth if available). **Never GitHub Packages**: players' installers have no token. The alpha stays on GitHub Releases. Never a snapshot ([ADR 0011](../../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §6). The smoke test is the integration test for that exact combination. **Compat is mandatory in our pack** ([ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §3). In the alpha it ships inside core. Once compat is split out, the pack pins core, compat, and (post-alpha) the gap-filler together.
- GTM config: `environmentalHazards = false` ([architecture 8](../../../design/architecture/#8-implementation-guidance-for-engineering-lead)), shipped as a config override so it applies on first boot.
- Server install uses packwiz-installer, pinned to a version, with side `server`. Client-only mods must not crash the server. Check each mod's `side` value.

## Tests to write first

The smoke-test script, before any other change. It:

1. installs the server side of the pack
2. starts the server with a timeout (EULA accepted in the script)
3. passes only if the log reaches `Done (` with no exception or crash report
4. stops the server cleanly

Show it failing once, for example against an invalid loader version.

## Commands

- `packwiz refresh` and `git diff --exit-code -- index.toml pack.toml`
- `./scripts/smoke-test.sh`: non-zero exit on failure
- CI (`ci.yml`) runs both on every push and pull request.

## Out of scope

- our mods (task 022)
- client launch testing
- the release workflow and distribution (task 025)
- choosing further mods
