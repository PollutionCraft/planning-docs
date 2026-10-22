---
title: "ADR 0002: Pollution model (global pressure + local field)"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user, "for now". It may be reworked after playtests.
- **Context:** The user wanted a hybrid model: a global part (time) plus a local part (amount, absorption, creation rate). It drives M4 aggression and must keep a new base playable (lose condition). Requirements: M2, M3, M4, M7, Goal 4, lose condition.

## Options

1. **Local only:** a new base is truly clean, but nothing escalates over time.
2. **Global only:** unreadable, and spreading and absorption become meaningless.
3. **Hybrid where global pressure can trigger attacks on its own:** a new base could be attacked before it pollutes.
4. **Hybrid, local gates and global scales** (Factorio-like).

## Decision

**Option 4.**

- **Local:** pollution per chunk (one Minecraft chunk, 16×16 blocks), see [ADR 0003](../0003-storage-and-simulation/).
- **Global pressure:** `p = raw/(1+raw)` in [0, 1), with `raw = a·activeTicks + b·grossEmitted`.
  - `activeTicks` counts server ticks **only while at least one player is online** (user rule: no time passes on an empty dedicated server). Minecraft's own clocks don't fit: world game time keeps running on an empty server in 1.20.1 and 1.21.1, and the `play_time` statistic is per player. See [architecture 3.6](../../architecture/#36-global-time-source).
  - `grossEmitted` is total emission. Absorption never reduces it.
  - **Pressure never decreases** (user decision), because both inputs only grow.
- **Aggression:** a chunk is aggressive when `local ≥ T0·(1 − k·p)`, with `0 ≤ k < 1`. A chunk with no local pollution is never aggressive.
- **Intensity:** siege caps, break speed, and siege-group size ([ADR 0008](../0008-siege-in-unattended-chunks/)) scale with `p`.
- **New base:** it inherits only `p`. It is safe until it pollutes; after that it triggers sooner and is hit harder.

## Consequences

- Aggression is readable and escalates over time.
- Costs two subsystems and three constants (`a`, `b`, `k`), tuned via R3.

## Blast radius / reversibility

`core` only (`GlobalPressure`, `AggressionPolicy`) plus one world record. Setting `a = b = 0` turns it into a local-only model.

## Revisit if

- Playtests show restarts are unwinnable or trivial.
- Mob evolution (a Could item) is added; it would reuse `p`.
- The user reworks the global part, as flagged.
