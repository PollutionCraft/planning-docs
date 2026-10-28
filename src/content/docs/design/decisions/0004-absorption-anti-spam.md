---
title: "ADR 0004: Absorption anti-spam rule"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user, "for now" (brief, open question 3). **Amendment proposed 2026-10-27 by [ADR 0017](../0017-absorber-data-sampling-and-cache/) (proposed):** curves become data (one file per absorber type) plus a global `absorptionMultiplier`; `r` has no key in the alpha. **User decision 2026-10-27 (B1): blocks only in the alpha**, so animals (decision 2) are deferred until after the alpha.
- **Context:** M3 needs natural absorption. M7 needs a guarantee that no single absorption method reaches net zero past a cutoff stage, "at any practical scale", for example with vertical tree farms or animal farms. The candidate in the brief is a maximum absorption per source type per chunk.

## Options

| Option | Prior art | Stops a vertical farm? | Stops a wide farm (many chunks)? | Readability | Cost |
| --- | --- | --- | --- | --- | --- |
| **A. Hard cap per type per chunk** (brief candidate) | Factorio caps tree damage per tree | Yes | **No.** Total absorption grows with the area that pollution reaches. | High | Low |
| **B. Diminishing returns per type per chunk** (`cap·(1−e^(−n/k))`) | Common in game balance | Yes | **No**, same as A | Medium | Low |
| **C. Saturation / damage:** absorbers degrade under load | Factorio trees lose leaves; GTNH deletes leaves | Partly | Partly. Auto-replanting farms beat it. | Medium | Medium (world edits) |
| **D. Surface-only sampling:** only the top block per column counts (at most 256 per chunk) | — (ours) | **Yes, structurally**: stacked layers don't count | No | High ("only what sees the sky") | Lowest (also the cheapest scan) |
| **E. Residual (non-absorbable) fraction:** past the cutoff, a fraction `r` of emission goes into the `persistent` pool, which only fixed decay removes | Factorio: evolution uses gross emission | Yes | **Yes, at any scale** | Medium | Low (second pool) |
| **F. Global absorption ceiling** relative to total emission | — | Yes | Yes | Low (feels arbitrary) | Low |

**Key finding:** any per-chunk rule (A, B, C, D) limits *density* but not *scale*. Pollution spreads, so planting forests over more chunks still adds absorption linearly. Factorio intends exactly this ("plant forests"). It is fine for M3 and for the time before the cutoff, but on its own it **cannot** meet M7's "any practical scale". Only a rule that is independent of absorber count (E or F) can.

## Decision

**Accepted: a layered rule, D + B + E.**

1. **D, surface sampling** (alpha). Kills vertical stacking at no extra cost.
2. **B, soft cap per absorber type per chunk** (alpha). This is the user's candidate, with a smooth curve instead of a cliff, so the 50th tree still helps a little and players don't hunt for the exact cap. Types come from tags: `leaves`, `grass`, `water`, `crops`, `animals`, etc. Animals are counted per entity type tag, with their own cap, which handles animal farms.
3. **E, residual fraction** (designed now, active after the cutoff, M7). The `persistent` pool exists in the data model from day one, with `r = 0` in the alpha. Past the cutoff stage, emitters of that tier send `r·amount` to `persistent`. The steady state at a base is then ≥ `r·E/λ` regardless of absorbers. Players reduce it only by emitting less, which is the brief's "can always reduce how much escapes" and fits M5 mitigation.

C is rejected for now: it edits the world, costs more, and auto-farms defeat it. It is a good candidate for the "environment changes" Could item later. F is rejected because players can't see or reason about it.

- **Consequences:** M3 works with intuitive local rules, and M7 gets a hard, testable guarantee. Cost: one extra `double` per chunk, plus per-type curve constants. Risk: surface sampling may ignore absorbers players expect to count (R6).
- **Blast radius / reversibility:** `AbsorptionModel` (`core`) and `AbsorberSampler` (adapter). The persistent pool is in the save format, which is why it is added now. Curves and `r` are config only (**amended by [ADR 0017](../0017-absorber-data-sampling-and-cache/), proposed:** curves are data plus one config multiplier; no `r` key in the alpha).
- **Revisit if:** playtests show forests make early game trivial (lower the caps), or the cutoff stage is defined (set `r` per tier).
