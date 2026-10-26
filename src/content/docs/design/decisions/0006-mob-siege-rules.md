---
title: "ADR 0006: Mob siege rules"
status: accepted
owner: Mimir
---

- **Status:** accepted 2026-10-20 by the user. Feasibility is still to be confirmed by spike [004](../../../plan/tasks/004-spike-siege-ai/). Where siege mobs come from in unattended chunks is a separate, proposed decision: [ADR 0008](../0008-siege-in-unattended-chunks/).
- **Context:** M4: above the threshold, mobs path to the source and break blocks to reach or destroy it. Losing a base must stay recoverable (lose condition).

## Decision

| Rule | Decision | Source |
| --- | --- | --- |
| Which mobs siege | **Configurable list** (config) plus tag `pollutioncraft:siege_eligible`. **Default: the zombie family.** Custom mobs (from other mods or our gap-filler) are allowed. Their tag entries ship in **compat**, not in the mob's own mod ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/)). Eligible types must be pathfinding mobs; others are ignored with a warning. | User |
| What they target | A player in sight first; else the chunk's `dominantSource`; else climb to the most-polluted neighbouring chunk | Recommendation (Factorio) |
| Breakable blocks | Hardness ≥ 0 and ≤ `maxBreakHardness`; never `siege_immune`; break time scales with hardness and intensity | Recommendation |
| Drops | **Drop as if mined, by default** (`siege.dropItems = true`). Configurable, so harder modes can come later. | User |
| `mobGriefing` gamerule | **Ignored. It does not stop siege block breaking.** Operators turn breaking off with our own `siege.breakBlocks` config, documented in the README. | User |
| Which chunks | **Any loaded, entity-ticking chunk**, however it is loaded (player, chunk loader, forced). Gated on ≥ 1 player online (recommended, see [ADR 0003](../0003-storage-and-simulation/)). | User; gate is a recommendation |
| Where mobs come from | Natural nearby mobs **plus spawned, persistent siege groups**, because vanilla mobs don't exist in loaded chunks with no player nearby. Proposed in [ADR 0008](../0008-siege-in-unattended-chunks/). Until that is accepted, the "any loaded chunk" rule only works where a player is near. | User rule; mechanism proposed |
| Land claims (e.g. FTB Chunks) | **Open question for the user.** See [architecture section 9](../../architecture/#9-questions-for-the-user), question 4. | Open |
| Limits | Per-source and global caps on sieging mobs, scaled by pressure intensity; repath cooldown; maximum path distance | Recommendation |

## Options that were considered

- **Mobs:** all hostiles, or zombie-like only.
- **Drops:** destroy without drops.
- **`mobGriefing`:** honour the gamerule, or disable siege when it is off.
- **Loaded chunks:** only chunks near a player.

## Consequences

- Sieges are predictable and testable (M4 GameTests).
- **Security/operations note:** ignoring `mobGriefing` removes a switch server operators expect. The mod's own config replaces it, and the README must state this clearly.
- Default drops make losing a base cost time rather than everything.

## Blast radius / reversibility

Siege goals, tags, and config. All rules are config or tags.

## Revisit if

- Harder modes are added (no drops).
- Mob variety or nests (Could items) arrive.
- Playtests show sieges are trivial or brutal.
