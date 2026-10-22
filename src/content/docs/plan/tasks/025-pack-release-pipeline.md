---
title: "025: Pack release pipeline"
status: proposed
owner: Heimdall
---

**Status 2026-10-22: pack scaffold done; every release step deferred (user decision).** The pack stays at **v0.0.1**: no tagged release, no GitHub Release, no distribution of any kind **until core functionality works**. Until then everything is local: Prism imports a local `packwiz modrinth export`, plus the local server smoke test and branch CI (task [002](../002-pack-scaffold-and-smoke-test/)).

- **Done:** pack recreated and pinned by hash (step 4a, with the recorded GTM deviation); packwiz and Actions pinned (step 3); `THIRD-PARTY.md` written and committed (step 5); `release.yml` written and checked locally (tag check, stale-index check, per-mod archive hash check), never run. Pack repo `PollutionCraft/pollutioncraft-pack`, branch `feature/pack-scaffold-and-smoke-test` (commits `2d1a463`, `e050379`). The remote exists and the branch is pushed (step 2, partly: no `main` yet).
- **Deferred until the trigger:** step 4 (re-hosting GTM; the `.mrpack` bundles GTM anyway, see the step 4a finding, so revisit whether it is still needed), step 6 (tagged `v0.0.1` release, plus the mismatch and stale-index checks on a real workflow run), step 7 (install check of the released `.mrpack` and `.zip`), step 8 (our mods in release notes).
- **Trigger:** the user declares core functionality working. Project-owner records that decision in the brief's Decisions log; it is not tied to a milestone yet. Only then does the first tagged release happen.
- **Conditions that stay attached to that first release** (project-owner ruling 2026-10-22, brief Decisions log): GitHub pre-releases only; the GTM jar unmodified; no Modrinth/CurseForge publication; `THIRD-PARTY.md` with GTM's LGPL-3.0 notice and source link attached to every release. The file exists now and `release.yml` attaches it. Before the first release, re-verify GTM's licence text (the ruling marks it an assumption) and the spark source tag.

**Not blocked** (for the deferred steps: blocked by the trigger above). The licence is decided ([ADR 0009](../../../design/decisions/0009-licensing/)) and the pack repo already exists. This task does **not** wait for [ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/): the pipeline is the same for either loader.

## Context

**Fact (user, 2026-10-20):** the alpha is distributed only through **GitHub Releases** of the pack repo. Each release carries:

- a Modrinth export (`.mrpack`)
- a CurseForge export (`.zip`), which bundles GTM, so it is for private testing only

The alpha is **not** published on Modrinth or CurseForge. Revisit when GTM has a numbered 1.21 release. Reasons:

- Modrinth requires external files to be bundled in the `.mrpack`, with licence proof.
- CurseForge rejects non-approved, non-CurseForge mods in public packs.

**Current state** (read 2026-10-20 in `../pollution-craft`; nothing committed, no remote):

- packwiz pack `PollutionCraft` 0.0.1: MC 1.21.1, NeoForge 21.1.264, GTM `8.0.0-SNAPSHOT+20261017-095459-36a6b38` (by URL and hash), EMI, spark
- `.gitignore` excludes `*.mrpack` and `*.zip`
- `.github/workflows/release.yml`, on a `v*` tag:
  1. checks the tag equals the `pack.toml` version
  2. checks `packwiz refresh` leaves the index unchanged
  3. exports both formats
  4. creates a GitHub pre-release
- `README.md` documents installation and release steps
- The workflow has never run.

## Goal

A tagged release of the pack repo produces a working GitHub pre-release that a tester can install in Prism (`.mrpack`) and the CurseForge app (`.zip`), and that keeps working after upstream snapshot builds move on.

## Steps and acceptance

1. **Licence: done** (user, 2026-10-20). The pack repo is MIT; `LICENSE` (c) 2026 Nessy and a README note are in place. Our mods are LGPL-3.0, but they live in the mod repo(s), not here.
2. **Remote:** the pack has its own repo. Create the GitHub remote and push the initial commit.
3. **Pin packwiz:** replace `go install github.com/packwiz/packwiz@latest` with a fixed commit (`@<sha>`), recorded in the README. Pin the GitHub Actions used by the workflow to full commit SHAs.
4. **Stable GTM download (review finding):** `mods/gtceu.pw.toml` downloads from GTM's rolling `releases/download/latest-1.21/` tag. The `.mrpack` refers to that URL rather than bundling the jar. Once GTM replaces the snapshot asset, installs of our released `.mrpack` will fail.
   - Fix: re-host the exact jar (same hash) as an asset on a release in our pack repo (for example tag `deps-gtceu-36a6b38`), and point the `.pw.toml` URL there.
   - LGPL-3.0 allows redistributing the unmodified jar, provided the notice is kept and the source is offered (item 5).
   - Repeat for any other mod not served from Modrinth's CDN.
   - Keep re-hosting the GTM jar for every future snapshot pin.
4a. **Decided pins** ([ADR 0001](../../../design/decisions/0001-minecraft-version-and-loader/), accepted): NeoForge **21.1.264** and GTM `8.0.0-SNAPSHOT+20261017-095459-36a6b38` with its recorded hash.
   - **Recorded deviation (Heimdall, 2026-10-22):** the original local pack was lost and recreated, and the exact build `8.0.0-SNAPSHOT+20261017-095459-36a6b38` is not available for download. The pack instead pins the closest available build: maven.gtceu.com snapshot `8.0.0-20261017.095456-124`, from the **same commit `36a6b38`** (embedded mod version `8.0.0-SNAPSHOT+36a6b38`, timestamp 3 s earlier), SHA-256 `057f8e9750b750bf020340a3d8ecdde0fe183c7a3a1ac1afae29777e031a1011`, recorded with `hash-format = "sha256"` in `mods/gtceu.pw.toml`. Per [ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/) this pack is the only GTM pin. Until step 4 re-hosts the jar, the source is that timestamped Maven URL, not a rolling one.
   - **Finding:** packwiz embeds GTM (not on Modrinth) in the `.mrpack`'s `overrides/` too, not only in the CurseForge `.zip`. Both archives redistribute GTM and are for private testing only. **Project-owner ruling 2026-10-22: acceptable for tester releases** on conditions: GitHub pre-releases only, unmodified jar, no Modrinth/CurseForge publication, and `THIRD-PARTY.md` (step 5) with GTM's notice and source link attached before the first tagged release. See the brief's Decisions log.
   - Bump either only deliberately, in its own change.
   - Each bump needs a green smoke test (task 002) **and** a world-load check: an existing test world from the previous pin loads without errors or missing registry entries.
   - Never point at `latest-1.21`.
5. **Third-party notices:** add `THIRD-PARTY.md` listing every bundled mod with its version, licence, and source link. Attach it to each release. Known: GTM is LGPL-3.0, so include its notice and source link. EMI and spark are still to check: verify each mod's licence on its project page, do not assume, and record any obligations, such as a source offer for copyleft licences. Once our own mod is bundled (task 022), add it as LGPL-3.0.
6. **Test release:** push tag `v0.0.1`, which matches `pack.toml`. The workflow must go green. Then:
   - **mismatch check:** push a tag with a deliberately wrong version (for example `v0.0.0-mismatch`) and confirm the job fails at the tag check. Delete the tag afterwards.
   - **stale-index check:** confirm the index check fails when `index.toml` is stale. Use a throwaway branch and tag.
7. **Install check:**
   - Import the `v0.0.1` `.mrpack` into a fresh Prism instance and the `.zip` into the CurseForge app.
   - Both reach the main menu and load a world with GTM present.
   - Record the launcher versions used in the README.

8. **Our mods in release notes:** the release workflow writes the exact versions of our own mods into the release notes. Once task 022 adds the core mod, these notes are the supported-combination record ([ADR 0011](../../../design/decisions/0011-cross-repo-artifacts-and-versioning/) §5). Our mods are pinned like any other mod: exact version and hash from the **GitHub Release asset** (or the CurseForge file, or Modrinth if available). **Never GitHub Packages**: players' installers have no token. The alpha stays on GitHub Releases. Never a range or snapshot. Until 022 the list is empty, and the step only has to handle that case. Compat is mandatory in our pack ([ADR 0012](../../../design/decisions/0012-independent-gap-filler-and-compat-as-integration-layer/) §3). In the alpha it ships inside core. Later, the notes list the core, compat, and gap-filler versions, and the release order is core and gap-filler, then compat, then the pack.

**Done when** (after the trigger above): steps 1–8 are complete. The `v0.0.1` pre-release exists with `.mrpack`, `.zip`, and `THIRD-PARTY.md`. The `.mrpack` downloads nothing from rolling URLs.

## Design references

- [Feasibility, section 3](../../feasibility/#3-pack-assembly-distribution-and-testing)
- [ADR 0007](../../../design/decisions/0007-tech-tree-and-mod-list/) (mod list)

## Files owned

In the pack repo:

- `.github/workflows/release.yml`
- `README.md`
- `THIRD-PARTY.md`
- `mods/*.pw.toml` (URL changes only)
- `index.toml`
- `pack.toml`

Task [002](../002-pack-scaffold-and-smoke-test/) starts after this task merges, so the two never edit the same files at once.

## Commands

- `packwiz refresh`, then `git diff --exit-code -- index.toml pack.toml`
- `packwiz modrinth export` and `packwiz curseforge export` locally, before tagging
- `gh run watch` / `gh release view v0.0.1` to confirm the CI result

## Out of scope

- server-pack artifact and server smoke test (task 002)
- adding mods
- publishing to Modrinth or CurseForge
- our own mods' release pipeline (the mod repo is set up in task 001)
