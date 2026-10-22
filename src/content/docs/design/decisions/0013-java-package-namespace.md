---
title: "ADR 0013: Java package namespace and Maven group"
status: proposed
owner: Mimir
---

- **Status:** proposed 2026-10-22 (Mimir). Engineering may build against it now; it is cheap to change until the first published release (task 026). The user confirms the GitHub owner below.
- **Context:** Task [001](../../../plan/tasks/001-mod-scaffold-and-ci/) needs the root package `<base>` for `<base>.core.*`, `<base>.api.*`, `<base>.mod.*`, and `<base>.compat.*`. The adapter-import and API-purity checks key on it ([ADR 0005](../0005-custom-mod-vs-existing-mods/), [ADR 0011](../0011-cross-repo-artifacts-and-versioning/) §1), and once `…api.*` ships it is public contract under semver.
- **Facts read 2026-10-22:**
  - The docs repo's remote is `git@github.com:PollutionCraft/planning-docs.git`, so the project's GitHub owner is the organisation **PollutionCraft**. The core-mod repo (`pollutioncraft`) has no remote yet; the pack repo has none either.
  - Sonatype Central: a namespace may reuse a domain you control, reversed. `io.github.<user>` is auto-verified only for the sign-up user; `io.github.<organisation>` needs manual verification ([Sonatype: namespaces](https://central.sonatype.org/register/namespace/)).
  - The org controls `pollutioncraft.github.io` through GitHub Pages; this docs site is published there.

## Options

| Option | For | Against |
| --- | --- | --- |
| **`io.github.pollutioncraft`** (org) | Reverse of a domain the project controls. Ends in `.pollutioncraft`, so `…pollutioncraft.api.*` in the existing checks reads literally. Not tied to one person. | Maven Central would need manual org verification (not needed: we publish to GitHub Packages). |
| `io.github.<user>.pollutioncraft` | Auto-verifiable on Central | Ties the public API to a personal account; a move to the org later breaks every consumer. |
| `com.pollutioncraft` or similar | Short | Needs a domain we don't own. Squatting a reverse domain is the thing the convention exists to prevent. |
| Bare `pollutioncraft` | Common in small mods | No ownership signal; collides easily. |

## Decision

- **Base package `<base>` = `io.github.pollutioncraft`.** So: `io.github.pollutioncraft.core`, `.api`, `.mod`, `.compat.<modid>`. Lower case, as Java package convention requires.
- **Maven group = `io.github.pollutioncraft`** (used from task 026). Artifact ids stay as in ADR 0011 (`pollutioncraft-1.21.1`).
- The mod id `pollutioncraft` is independent of the package; renaming the mod (still provisional) does not rename packages.
- Later repos use the same namespace: compat keeps `io.github.pollutioncraft.compat.*` (so the split stays a copy, ADR 0010). The gap-filler gets `io.github.pollutioncraft.<gapfillername>` once named (architecture §9 Q8).

## Consequences

- Engineers can create Java sources and the four ArchUnit checks with concrete package names.
- **Follow-up for task 027:** compat's adapter-import check ("no `pollutioncraft` package outside `…pollutioncraft.api.*`") must also allow the gap-filler's public package, because compat reads its activity signals (ADR 0012). Define the gap-filler's API package when it is named.
- If we ever publish to Maven Central, the org namespace needs a manual verification request.

## Blast radius / reversibility

Every Java source file, the architecture checks, the mod's entry point, and (after task 026) every consumer's imports. Free to change before the first release; after it, a MAJOR version bump for `…api.*`.

## Revisit if

- The project moves to a different GitHub owner or acquires its own domain **before** the first release.
- The user prefers a personal namespace.
