---
title: "008: Server config with validation and runtime overrides"
status: proposed
owner: Heimdall
---

**Blocked by:** 005. Runs in parallel with 007. Task 009 builds on the runtime-override layer defined here.

**Decision (user, 2026-10-22):** when [007](../007-storage-active-ticks-scheduler/) adopts these accessors (reading `PollutionCraftMod.config()` once at the scheduler boundary), add a test that goes through the scheduler.

## Goal

A validated server config for every rate, interval, threshold and cap that exists so far, plus an in-memory override layer so values can be changed live without touching the file.

## Design references

- [Architecture 4: units and errors](../../../design/architecture/#4-conventions), [3.3 interval step](../../../design/architecture/#33-key-flows), [3.5 config](../../../design/architecture/#35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content)
- [ADR 0003](../../../design/decisions/0003-storage-and-simulation/) (accepted)

## Behaviour

- **Keys now:** `spreadIntervalTicks` (default 20), `spreadFraction` (0.02), `spreadThreshold`, `persistentDecay`, `epsilon`, `emissionMultiplier` (scales all emitter rates), `defaultCapacity` (absorption placeholder). Later tasks add their own keys through the same mechanism.
- **Starting defaults** (PU scale: 1 PU = one lit furnace for one interval, see the [glossary](../../../reference/glossary/)). **Placeholders, to be tuned at the P4 playtest. This list is the single source of the values; other pages link here and do not repeat them.**

  | Key | Default |
  | --- | --- |
  | `spreadThreshold` | 15 |
  | `epsilon` | 0.001 |
  | `persistentDecay` | 0 |
  | `emissionMultiplier` | 1.0 |
  | `defaultCapacity` | 100 (user decision; placeholder like the rest) |
- **Units:** intervals in ticks, rates per interval. Each key's comment gives the seconds equivalent.
- **Validation:** every value is bounded. NaN, infinite, negative or out-of-range values are rejected at load, the default is kept and the key is logged. Cross-field rule: `4 × spreadFraction < 1`.
- **Key registry (single source of truth):** each key is declared once with its type, default, bounds and comment. The config file, validation, `/pollution tune` (009) and its tab-completion all read the registry. Adding a key must not require editing a second list.
- **Runtime overrides:**
  - `RuntimeOverrides`: set, clear one, clear all, list. The accessors consulted by the simulation return the override if present, else the config value.
  - An override passes the **same validation**, including cross-field rules checked against the effective values.
  - Never written to disk; cleared on restart. Overrides are server-wide.
  - Config reload keeps active overrides and logs that it did.
- Accessors are read on the server thread; the simulation reads once per interval, not per chunk, so overrides apply from the next interval.

## Files owned

`mod`: config spec, registry, `RuntimeOverrides`, accessors used by the scheduler (007 switches to them when both have merged). `core` stays free of config types and receives plain parameters.

## Tests to write first

1. Unit: each key rejects NaN, infinite, negative and out-of-range input and falls back to the default with one log line.
2. Unit: `4 × spreadFraction ≥ 1` rejected, both from file and from an override.
3. Unit: override precedence, clear one and clear all, reload keeps overrides.
4. Unit: the registry covers every key that has an accessor (reflection or a generated list check), so a key cannot exist without bounds.
5. GameTest: an override of `spreadFraction` changes the next interval's spread.

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

The `/pollution tune` command itself (009), siege, aggression and pressure keys (added with 016–020), datapack-driven emitter rates (011).
