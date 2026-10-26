---
title: Project brief
status: draft
owner: Odin
---

What we are building, for whom, and how we will know it worked.

Labels: **Fact** (user stated it), **Assumption** (mine or the user's belief, to verify), **Open question** (user decides).

## Problem

Minecraft automation has no cost. Players scale machines freely and nothing pushes back. Factorio solves this with pollution that angers enemies. **Fact:** the user wants a modpack partly inspired by that. Working name: PollutionCraft (tentative).

## Users

- **Fact:** solo players and small groups.
- **Fact:** cooperative PvE play style.

## Core loop

**Fact:** Machines and technology generate pollution. Pollution spreads into the world. Nature absorbs it (living blocks, mobs, passive animals). When pollution builds up, mobs grow aggressive. They are drawn to the source and destroy it, the player-built blocks around it, and the players.

## Goals

1. Make automation growth carry a real, visible risk. (Must)
2. Give the player meaningful ways to respond: reduce, absorb, or defend. (Must)
3. Make the pollution state readable, so players can see why mobs are angry. (Should) **Assumption.**
4. Keep pollution unavoidable at higher tech stages, so it cannot be cheesed away. (Must)

## Release plan

### v0.1 alpha

**Fact:** The alpha must prove three things work: pollution generation, propagation, and mob behavior.

**Fact (confirmed 2026-10-20):** The alpha's primary goal is that the base pollution mechanics work. In: M1 (furnace first; see the M1 criterion), M2, M3 (absorption), M4. Out: M5 (defenses) and M6 (tech gating), left for later iterations.

**Fact, explicitly out of the alpha:** mob evolution, mob variety, nests, environment changes.

### Later
M5, M6, M7, plus the Could items.

## Scope

### Must
- M1. Machines emit pollution at a rate tied to their activity.
- M2. Pollution spreads from sources and accumulates in the world.
- M3. The world absorbs pollution (living blocks, mobs, animals).
- M4. Accumulated pollution makes mobs hostile toward sources and players, and they destroy blocks.
- M5. Players have at least one defense and one mitigation option.
- M6. Machine tiers are gated by a progression path.
- M7. After a defined tech stage, an emitting base cannot be brought to zero pollution by absorption alone. Players can always lower pollution by emitting less. Absorption must resist spam (for example, a massive vertical tree farm cannot cancel all emissions).

### Could (later releases)
- Mobs evolve over time.
- Varied mob types and abilities (spit, throw, explode, fly, tank).
- Factorio-style nests versus a spawner-only mechanic.
- Environment changes under heavy pollution.
- Pollution display for players.

### Non-goals
- **Fact:** the alpha does not include evolution, variety, nests, or environment changes.
- **Fact:** no permanent non-goals beyond the alpha exclusions, as of 2026-10-20.

## Lose condition

**Fact:** The player can lose a base to being overrun. It is not a permanent game over: the player can found a new base elsewhere and keep surviving.

## Acceptance criteria

- **M1.** Given a running machine, when it operates, then pollution at its location rises. Given an idle machine, then it adds none.
  - **Fact (user, 2026-10-22):** the first emitter test uses the vanilla furnace only. M1 is demonstrated with the furnace first. Other vanilla blocks follow, then GregTech machines. M1 is not fully met until the later emitters are covered.
- **M2.** Given a source and no absorption, when time passes, then pollution appears in surrounding areas and the total rises.
- **M3.** Given a source in an area with absorbers, when pollution is emitted, then local pollution settles lower than the same source in an area without absorbers.
- **M4.** Given pollution above the aggression threshold, when mobs are nearby, then they path toward the source and break blocks to reach or destroy it. Given pollution below the threshold, then they do not.
- **M5.** Given a high-pollution area, when the player uses a defense or mitigation option, then the attack outcome or pollution level measurably improves.
- **M6.** Given a new world, when the player starts, then higher-pollution machines are unavailable until earlier progression steps are done.
- **M7.** Given a base past the cutoff tech stage that keeps emitting at a fixed rate, when it runs long enough to settle and the player adds absorbers of any type and any amount, then settled local pollution stays at or above a floor that absorbers cannot lower. Given the same base, when the player lowers its emission, then the floor drops. Given a base before the cutoff, then settled pollution may reach zero.
  - Rewritten 2026-10-20. The old wording ("net pollution stays above zero") was not testable: any system with decay settles where net flow is zero. The floor formula is the architect's ([architecture, R5](../../design/architecture/)). The floor's value is not set.
- **Lose condition.** Given a base destroyed by mobs, when the player moves elsewhere and builds again, then play continues with no forced world reset.

Thresholds, rates, and the cutoff stage are not set. The criteria become numeric once they are decided.

## Product shape

**Fact (user, 2026-10-20):**
- A core pollution mod, with adapters for tech mods (GregTech, AE2 and others).
- Thermal Expansion and IC2 are removed as integration targets. **Fact (architect's check, relayed 2026-10-20):** neither has a usable build on either candidate version. Revisit if that changes.
- A gap-filler mod for mobs and any missing tech.
- Tech tree: GregTech-led is preferred, not strictly required. Create is allowed but not primary. Balance between tech mods is future work.

## Siege rules (accepted for now)

**Fact (user, 2026-10-20).** Details live in [ADR 0006](../../design/decisions/0006-mob-siege-rules/).
- Mobs can attack any loaded chunk, however it is loaded (player or chunk loader).
- Broken blocks drop items by default. This is configurable.
- Siege mobs are configurable. Default is zombies. Custom mobs are allowed.
- The `mobGriefing` gamerule does not stop siege block breaking.

## Siege groups: scope assessment

[ADR 0008](../../design/decisions/0008-siege-in-unattended-chunks/) (proposed) has the mod spawn a siege group in or next to an aggressive loaded chunk. Local pollution pays for each mob. The user decides. This is my recommendation.

**Does it fit M1–M4?** Yes, with limits.
- **For:** the user's accepted rule is that any loaded chunk can be attacked. Without spawning, an unattended base is never attacked. The alpha could then only prove cause and effect with a player standing nearby. The user also named spawn rate as part of how pollution drives mobs. The alpha goal is to prove mob behavior, so this belongs in it.
- **Against:** it is new work the brief did not list, and it touches spawn placement, caps, and performance. **Assumption (ADR 0008, untested):** vanilla spawning and despawning rules leave unattended bases with no attackers. Spike 004 should confirm that first.

**Recommendation:** include the minimal version in the alpha.
- One interval and a hard cap on group size.
- Cost paid from local pollution.
- Mobs from the configured siege list.
- A config switch to turn it off.

Defer to later: natural mobs joining sieges (the ADR's option C extension), variety, and anything nest-like. If spike 004 shows the cost is too high, fall back to existing mobs only (ADR option A) and record the limitation: unattended bases are not attacked.

**Proposed criterion if accepted (M4b):** Given a loaded chunk above the aggression threshold with no player nearby, when the interval passes, then a group spawns, local pollution drops by the group's cost, and the group paths to the source. Given a chunk below the threshold, then no group spawns.

## Constraints

- **Fact (user decision, 2026-10-22):** Minecraft 1.21.1 with NeoForge. The user validated the GregTech Modern (GTM) 8.0.0 snapshot in Prism before choosing. See [ADR 0001](../../design/decisions/0001-minecraft-version-and-loader/).
- **Risk (Fact, architect research read 2026-10-20):** GTM 8.0.0 on 1.21.1 is a rolling snapshot. The last numbered release there is v7.0.2 (2025-07-20), and 8.0.0 has no release date. The pack depends on an unreleased build. 1.20.1 Forge (GTM v7.5.3) was the alternative, since GregTech does not force 1.20.1.
- **Assumption:** A custom mod is needed, since pollution propagation and pollution-targeted block breaking are unlikely to exist in current mods. The architect's design assumes one. Spike 004 tests the siege part.

## Open questions

For the user:
1. ~~Minecraft version and loader.~~ **Decided 2026-10-22:** 1.21.1 NeoForge (see Constraints and Decisions).
2. **Which tech stage is the net-zero cutoff?** Open. HV is proposed by the architect, not decided. It also depends on the tech tree and mod list, which the user decides with product-architect and engineering-lead. Not needed for the alpha.
3. **Starting numbers.** Open. Emission rates, thresholds, spread rate and interval, and the M7 floor. Tuned in alpha playtests.
4. **Does the M7 rewrite keep your intent?** The new wording says absorbers cannot take a polluting base to zero, and that emitting less always helps. Please confirm.
5. **Do siege groups belong in the alpha?** Open. My recommendation is in "Siege groups: scope assessment" above.
6. **Land-claim mods (FTB Chunks and similar).** Open. Claims may stop mobs breaking blocks in claimed chunks, which would stop sieges on exactly the bases players protect. Do we support such mods, block them, or ignore them? The user decides, with the architect's view on how claims interact with siege breaking. Not verified this session.
7. **Which machines emit in the alpha?** Partly answered (2026-10-22). Furnace first, then other vanilla blocks. Still open: which other vanilla blocks, and whether GregTech machines are in the alpha or a later release. This depends on spike 003 (GregTech activity hook) and the version and loader choice.

Accepted for now, may be reworked later (see Decisions):
- **Global and local pollution.** Local unit is one chunk (16×16 blocks). Spread rate and interval are tunable. The global part is "pressure", driven by world time (it does not tick on a dedicated server with nobody online) plus total emissions, and it never decreases. A new base keeps the global pressure and starts with clean local pollution. Whether that makes restarting too hard is a tuning risk (architecture R3).
- **Absorption anti-spam.** A three-layer rule: only the top block of each column counts, a soft cap per absorber type per chunk, and an unabsorbable pool past the cutoff stage. A per-chunk cap alone is not enough, per Mimir.

For product-architect:
- Spikes 003 (GregTech activity hook) and 004 (siege AI).
- Align the architecture page with the accepted siege rules (see Decisions).

## Decisions

### 2026-10-20: Alpha scope
- Context: Needed a first release target.
- Options: Full core loop plus defenses and gating, or only the pollution and mob loop.
- Decision: v0.1 alpha proves generation, propagation, and mob behavior. Evolution, variety, nests, and environment changes are excluded.
- Evidence: User statement (Fact), confirmed 2026-10-20: M3 in; M5 and M6 out.
- Revisit if: The alpha loop proves unplayable without defenses.

### 2026-10-20: Net-zero pollution is not allowed past a tech stage
- Context: Unlimited absorption would let players cancel pollution and defeat the core pressure.
- Options: Allow net zero always; forbid it always; forbid it after a tech stage.
- Decision: Forbid after a tech stage (M7). Before that, net zero may be reachable. The stage is undefined.
- Evidence: User statement (Fact).
- Revisit if: The tech tree defines stages, or playtests show early net zero removes the pressure.

### 2026-10-20: Global/local model and absorption anti-spam, accepted for now
- Context: Brief open questions 1 and 3.
- Options: See [ADR 0002](../../design/decisions/0002-pollution-model-global-local/) and [ADR 0004](../../design/decisions/0004-absorption-anti-spam/).
- Decision: Local pollution per chunk plus a global pressure from world time and total emissions that never decreases. Three-layer anti-spam. The per-chunk cap alone is not enough.
- Evidence: User statement (Fact); Mimir's analysis (architecture page).
- Revisit if: Playtests show a new base is unwinnable under global pressure, or players find absorption exploits.

### 2026-10-20: Siege rules and product shape
- Context: Architect's questions 4 and 6.
- Decision: As in "Siege rules" and "Product shape" above. Tech tree is GregTech-led by preference, not requirement.
- Evidence: User statement (Fact).
- Revisit if: Spike 004 shows the rules are too costly or unreliable.

### 2026-10-22: Minecraft 1.21.1 with NeoForge
- Context: GregTech runs on 1.20.1 Forge or 1.21.1 NeoForge ([ADR 0001](../../design/decisions/0001-minecraft-version-and-loader/)). The user's earlier belief that it forced 1.20.1 was wrong.
- Options: 1.20.1 Forge (GTM numbered release v7.5.3); 1.21.1 NeoForge (GTM 8.0.0 snapshot, last numbered release v7.0.2).
- Decision: 1.21.1 NeoForge.
- Evidence: User decision (Fact), made after validating the GTM 8.0.0 snapshot in Prism. The snapshot status is from the architect's research (read 2026-10-20).
- Revisit if: GTM 8.0.0 stays unreleased and snapshots break the pack, or a needed mod lacks a 1.21.1 build.

### 2026-10-22: First emitter test is the vanilla furnace only
- Context: M1 needs a first, smallest demonstration.
- Decision: Furnace only first. Other vanilla blocks follow, then GregTech machines.
- Evidence: User statement (Fact).
- Revisit if: Spike 003 shows the GregTech hook is cheap enough to include earlier.

### 2026-10-22: Tester releases may bundle the GTM jar
- Context: packwiz embeds the GTM jar in both the `.mrpack` (`overrides/`) and the CurseForge `.zip` (task 025 finding).
- Options: accept for tester releases; or host GTM externally (not possible for `.mrpack` without public publishing rules).
- Decision: Acceptable, on conditions: GitHub pre-releases only, unmodified jar, no Modrinth/CurseForge publication, and `THIRD-PARTY.md` with GTM's LGPL-3.0 notice and source link attached to every release (025 step 5). The first tagged release is blocked until that file exists.
- Evidence: LGPL-3.0 allows redistributing the unmodified jar with notice and source offer (025 step 4). I have not checked GTM's licence file myself this session: **Assumption** until 025 step 5 verifies it.
- Revisit if: the pack is published on Modrinth or CurseForge, or GTM's licence or distribution terms change.

### 2026-10-20: M7 rewritten to be testable
- Context: Mimir showed "net pollution stays above zero" cannot be tested, since a decaying system always settles where net flow is zero.
- Options: Keep the wording; define a floor that absorbers cannot lower.
- Decision: Floor definition (see M7 criterion). I agree with the architect's direction. The floor formula belongs to the architect.
- Evidence: Architecture R5. User confirmation of intent is pending (open question 4).
- Revisit if: The user says the floor does not match their intent.

### 2026-10-20: Losing a base is not permanent game over
- Context: Defines what failure means.
- Decision: A base can be overrun. The player can found a new base and continue.
- Evidence: User statement (Fact).
- Revisit if: Global pollution is chosen and makes restarting unwinnable.
