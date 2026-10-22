---
title: "ADR 0009: Licences for our mods and the pack"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user.
- **Context:** We publish our own mods (core, compat, gap-filler; [ADR 0005](../0005-custom-mod-vs-existing-mods/)) and a pack repo. The GTM adapter calls GregTech CEu Modern. **Fact:** GTM is licensed LGPL-3.0, per the GitHub API for `GregTechCEu/GregTech-Modern`.

## Options

| Option | For | Against |
| --- | --- | --- |
| **MIT or another permissive licence for the mods** | Simplest. Maximum reuse. | Fine for separate jars that only call GTM's public API. But any GTM code we copy or patch in (for example by Mixin) must stay LGPL-3.0, so we would have to track which files are which. |
| **LGPL-3.0 for the mods** | Matches GTM. Copied or Mixin'd GTM code is then covered without any per-file tracking, so the question never comes up. Others can still use our API from their own mods under any licence. | Changes to our mods must stay open under LGPL-3.0. That is acceptable for an open project. |
| ARR | Full control | Blocks contributions and pack reuse; against the project's openness |

## Decision

- **Mods** (`pollutioncraft`, `pollutioncraft_compat`, `pollutioncraft_content`): **LGPL-3.0**.
- **Pack repo** (metadata, configs, workflows): **MIT**.

Rationale (the user's; this is not legal advice): separate jars that use GTM only through its public API stay independent works under the LGPL. But copied or Mixin'd GTM code must be LGPL-3.0. Licensing every mod LGPL-3.0 makes that a non-issue. The pack holds no GTM code, only metadata, so permissive MIT suits it.

## Consequences

- Per repo ([ADR 0010](../0010-four-repositories/)): the core, compat, and gap-filler repos are LGPL-3.0; the pack repo is MIT. Each mod repo ships the LGPL-3.0 text **and** the GPL-3.0 text it builds on.
- Bundled third-party mods keep their own licences, listed in the pack's `THIRD-PARTY.md`.
- ARR mods (for example Improved Mobs, Pollution of the Realms) are unaffected, because we don't adopt them ([ADR 0005](../0005-custom-mod-vs-existing-mods/)).

## Blast radius / reversibility

The `LICENSE` files and contributor expectations. Relicensing later needs every contributor's consent, so it gets harder over time.

## Revisit if

- We drop GTM integration.
- A dependency with an incompatible licence becomes necessary.
