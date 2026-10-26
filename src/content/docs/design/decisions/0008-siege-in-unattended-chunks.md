---
title: "ADR 0008: Siege mobs in loaded chunks with no player nearby"
status: proposed
owner: Mimir
---

- **Status:** proposed. The user decides. Raised by the user's rule that "any loaded chunk can be attacked, however it is loaded" ([ADR 0006](../0006-mob-siege-rules/)).
- **Context:** Attacks need mobs. **Assumption** (to verify in spike [004](../../../plan/tasks/004-spike-siege-ai/)): in vanilla, natural spawning needs a player nearby, and hostile mobs despawn when no player is within 128 blocks. If that holds, a chunk-loaded base with nobody nearby has no attackers, so the user's rule would never trigger there. Requirements: M4, lose condition, performance budget.

## Options

| Option | Prior art | For | Against |
| --- | --- | --- | --- |
| **A. Existing mobs only** | Vanilla | No spawning code | Unattended loaded bases are never attacked, which contradicts the user's rule |
| **B. Siege groups:** the mod periodically spawns a group in or next to an aggressive loaded chunk, paying a cost out of local pollution. The mobs are persistent and sent at the `dominantSource`. | Factorio attack groups (pollution pays for attackers); vanilla raids (spawned group sent to a target) | Meets the rule. Attacks scale with pollution and pressure, and pollution drops as attacks are "bought". | Spawning code, caps, and spawn-placement rules. Brings a light "spawn rate" mechanic into the alpha. |
| **C. A + B:** natural nearby mobs join sieges, and siege groups are added | Both | Best feel whether or not a player is present | Both costs |
| **D. Simulate attacks abstractly** in unattended chunks (dice rolls remove blocks) | — | Cheapest at runtime | Not visible and feels unfair. Not recommended. |

## Decision (recommendation)

**C.** Natural hostile mobs from the siege list join when nearby, and siege groups guarantee attacks in any loaded aggressive chunk.

Siege group rules:
- **Interval:** a configurable number of minutes, with random jitter (Factorio uses 1–10 minutes).
- **Size and cost:** group size grows with intensity (pressure) and is bounded by a hard cap. Each mob costs `costPerMob` PU, removed from the chunk's local pollution.
- **Mobs:** drawn from the siege list ([ADR 0006](../0006-mob-siege-rules/)).
- **Placement:** spawned at the edge of the aggressive area, on valid spawn positions, outside a configurable minimum distance from players.
- **Persistence:** mobs are marked persistent and removed when their group's target no longer exists or after a timeout, so there are no permanent mob build-ups.
- **Gate:** only while ≥ 1 player is online on the server (recommended; see [ADR 0003](../0003-storage-and-simulation/)).

## Consequences

- The user's rule is honoured, and the mechanic is legible: more pollution means more groups.
- **Scope:** this adds a spawn mechanic to the alpha. The brief excludes nests, variety, and evolution, but not spawning. Project-owner should confirm it fits the alpha scope.
- **Risks:** offline-feeling base loss (mitigated by the online gate and drops on by default), and performance (group caps, R7).

## Blast radius / reversibility

A new siege-group component in the core mod, plus config. Turning it off (`siegeGroups.enabled = false`) reverts to option A.

## Revisit if

- Nests (a Could item) are added; they would replace siege groups as the source.
- Playtests show unattended attacks frustrate players.
