---
title: "ADR 0014: SPDX licence id for our mods (LGPL-3.0-only)"
status: proposed
owner: Mimir
---

- **Status:** proposed 2026-10-22 (Mimir). **It refines [ADR 0009](../0009-licensing/)** (accepted), which says "LGPL-3.0" without saying whether later versions are allowed. Nothing else in 0009 changes. The user confirms.
- **Context:** Task [001](../../../plan/tasks/001-mod-scaffold-and-ci/) puts an SPDX id in the mod metadata (`neoforge.mods.toml`) and file headers. SPDX deprecates the bare `LGPL-3.0`; the choice is `LGPL-3.0-only` or `LGPL-3.0-or-later`.
- **Facts read 2026-10-22:** GTM's GitHub licence is `LGPL-3.0` (GitHub API) and its `gradle.properties` declares `mod_license = LGPL-3.0 license`, with no "or later" wording in either. Its `LICENSE` is the LGPL v3 text.

## Options

| Option | For | Against |
| --- | --- | --- |
| **`LGPL-3.0-only`** | The literal reading of what the user accepted in ADR 0009, and of GTM's own declaration. We keep control: no future licence version applies to our code unless contributors agree. Copied or Mixin'd GTM code fits either way. | Moving to a future LGPL version needs every contributor's consent (ADR 0009 already accepts that relicensing gets harder). |
| `LGPL-3.0-or-later` | GNU's recommended default. Others may use our code under a future LGPL. Can later be narrowed to `-only`; `-only` cannot be widened without consent. | Delegates future terms to the FSF; broader grant than the user stated. |

## Decision

**`LGPL-3.0-only`** for all our mods (core, compat, gap-filler). It is the conservative reading of the accepted decision: it grants exactly what the user chose, and nothing more.

- `LICENSE` = LGPL-3.0 text and `COPYING` = GPL-3.0 text (ADR 0009), both also in the jar's `META-INF/`.
- Mod metadata `license = "LGPL-3.0-only"`. Source file headers, if used, carry `SPDX-License-Identifier: LGPL-3.0-only`.
- The pack stays MIT.

## Consequences

Zero churn: engineering already defaulted to `-only`. If the user prefers `-or-later`, switch now, while the user is the only contributor: one metadata string, the README note, and headers.

## Blast radius / reversibility

`LICENSE` notes, metadata, headers, contributor expectations. Trivial now; after outside contributions, widening to `-or-later` needs their consent.

## Revisit if

- The user wants to allow future LGPL versions.
- A dependency requires `-or-later` compatibility.
