---
title: "013: AbsorptionModel soft-cap curve, persistent pool fixed at r = 0"
status: accepted
owner: Heimdall
---

**Blocked by:** nothing (005 is done). **Blocks:** 014 (sampler and wiring), which supplies the curves and the counts. Pure Java in `core`; no Minecraft, no config, no data.

## Acceptance (Odin, 2026-10-28): accept

Branch `feature/013-absorption-model` (from `main` at `871ca21`), not yet committed, pushed or merged. Judged from Heimdall's brief, Brokkr's report and Heimdall's review (all read). I have no shell and did not rerun anything. Reported (Heimdall's runs): clean build and 89 of 89 GameTests, core 86 unit tests (28 new) and mod 200, none failed, class-load check passed, six mutants each failing their intended test.

| Criterion | Result | Evidence |
| --- | --- | --- |
| `AbsorberCurve(cap, k)` gives `cap·(1 − e^(−n/k))`: 0 at `n = 0`, `cap·(1 − 1/e)` at `n = k`, never above `cap`, increasing in `n` | Pass | `AbsorberCurveTest`; mutant with the exponent missing `k` fails two tests |
| Invalid `cap`, `k` or `n` rejected, naming the value | Pass | `invalidCapOrKThrowsAndNamesTheValue`, `aNegativeCountThrows`; mutants (`k = 0` allowed, negative `n` allowed) fail them |
| `SoftCapAbsorption`: ordered type table, sums each curve in table order, no allocation, unknown id gives −1, duplicate ids rejected, length mismatch or negative count throws | Pass | `SoftCapAbsorptionTest`; mutants (duplicate check off, short-array-only length check, `indexOf` returning 0) fail their tests |
| Result finite and ≥ 0 even for huge counts, deterministic | Pass | `theResultIsFiniteAndNotNegativeEvenForHugeCounts`, `theSameCountsGiveTheSameBitsEveryTime` |
| `AbsorptionModel` stays the per-chunk seam, now a functional interface; no implementation here | Pass | `theAbsorptionModelIsAFunctionalSeam…`; `DiffusionJob` untouched |
| Soft cap seen as a player sees it: a saturated type adds almost nothing, another type still adds its share | Pass, with a corrected clause (see below) | `SoftCapAbsorptionTest` |
| With `DiffusionStep`: isolated chunk below the spread threshold, `E ≤ C` stays at 0, `E > C` grows by exactly `E − C`, `absorbed = min(E, C)` | Pass | `AbsorptionStepTest` |
| `r = 0`: `persistent` stays exactly 0 and emissions land only in `absorbable`; no `r` key and no split code | Pass | 150 intervals through the real scheduler with spread and decay on, run checked to have emitted over 1,000 PU and spread over 10 chunks; a mutant putting emissions in `persistent` fails four tests |
| Cost inside the budget | Pass | `capacity()` 31 to 32 ns per call (4 types); recomputing 2,500 chunks × 4 types once is 0.077 to 0.081 ms, about 0.004 ms/tick if spread over a 20-tick interval, against 0.05. Printed, not asserted |
| Only `core` touched | Pass | `AbsorptionModel` (marker and documentation), `AbsorberCurve`, `SoftCapAbsorption`, four test classes; nothing in `mod`, `api`, config or data |

## Goal

The maths of ADR 0004 B ([ADR 0004](../../../design/decisions/0004-absorption-anti-spam/), accepted): a soft cap per absorber type per chunk. A chunk's absorption capacity per interval is

`capacity = Σ over types t of cap_t · (1 − e^(−n_t / k_t))`

where `n_t` is the number of absorbers of type `t` sampled in the chunk, `cap_t` is the most that type can absorb in one chunk per interval (PU), and `k_t` sets how fast the curve approaches it. At `n = k` a type gives about 63% of `cap`, and every extra absorber still adds a little: no cliff.

The alpha absorbers are blocks only (user decision, 2026-10-28; [brief, Decisions](../../../brief/overview/)). Placeholder curves, used in task 014 and not hard-coded here: leaves 2.0/64, grass and plants 0.5/128, crops 1.0/64, water 0.25/128 (`cap`/`k`). This task is agnostic about which types exist.

## Behaviour

- **`AbsorberCurve`:** an immutable record. `cap` finite and ≥ 0, `k` finite and > 0, else `IllegalArgumentException` naming the value. `absorb(int n)` for `n ≥ 0` returns `cap · −expm1(−n/k)` (accurate for small `n/k`), finite, ≥ 0 and never above `cap`; a negative `n` throws.
- **`SoftCapAbsorption`:** built from an ordered list of (type id, curve); ids are plain non-blank strings, duplicates are rejected, the list is copied. `capacity(int[] counts)` takes `counts[i]` for the i-th type, throws on a length mismatch or a negative count, allocates nothing and sums in table order. `indexOf(String)` returns −1 for an unknown id (so 014 can skip types a datapack removed). An empty table gives 0.
- **`AbsorptionModel`:** stays `capacity(long chunkKey)`, marked `@FunctionalInterface`, so 014 can pass it where `DiffusionJob` takes a `LongToDoubleFunction`. No implementation here; looking up a chunk's counts is 014's (sampler and cache).
- **Not on the per-interval path:** 014 computes a chunk's capacity when the chunk is sampled (and again on a data reload) and keeps it as a plain `double` per chunk. The interval then only reads a number.
- **`r = 0` (ADR 0004 E):** in the alpha no emission goes to the `persistent` pool. That was already true (`DiffusionJob` puts emissions into `absorbable`). There is no `r` config key and no split code; `r` arrives with the cutoff stage (M7, post-alpha). This task only pins the invariant with a test.

## Design references

- [ADR 0004](../../../design/decisions/0004-absorption-anti-spam/) (D + B + E; this task is B plus E's invariant)
- [Architecture 3.2 data model](../../../design/architecture/#32-data-model) (`absorbable`, `persistent`), [3.3 interval step](../../../design/architecture/#33-key-flows) (absorb `min(absorbable, capacity(chunk))`), [5 budget](../../../design/architecture/#5-non-functional-budget)
- Task [005](../005-shared-interfaces-and-diffusion/) (the interface)

## Files owned

`core`: `AbsorptionModel.java` (documentation and the functional-interface marker only), new `AbsorberCurve.java` and `SoftCapAbsorption.java`, and their tests (`AbsorberCurveTest`, `SoftCapAbsorptionTest`, `AbsorptionStepTest`, `AbsorptionPerformanceTest`). Nothing in `mod` or `api`.

## Tests

1. Curve: `n = 0`, `n = k`, large `n`, strictly increasing while below `cap`, `cap = 0`, and every invalid input.
2. Table: the sum equals the sum of each curve; type order does not change the result for the same counts by id; duplicates rejected; length mismatch and negative counts throw; unknown id gives −1; empty table gives 0.
3. Anti-spam shape (placeholder leaves curve): going from `k` to `10·k` leaves adds less than the first `k` did; once a type is saturated, more of it adds almost nothing while another type still adds its share.
4. With `DiffusionStep`: `E ≤ C` returns to 0 each interval; `E > C` grows by exactly `E − C`; `absorbed = min(E, C)` where the chunk survives.
5. The `r = 0` invariant, through the scheduler.
6. Cost, reported and not asserted.

Red evidence: for the new classes the first red is a compile error (accepted for pure-maths classes written test-first, and confirmed by mutants); the functional-seam test went red on its assertion; the behaviour tests went red through the mutants above.

## Commands

`./gradlew clean build runGameTestServer --rerun-tasks --no-build-cache` and `./gradlew :core:test`.

## Notes recorded at acceptance

- **The brief's anti-spam clause was wrong for the placeholder curves.** It said going from `k` to `10·k` leaves adds less than adding `k` grass to `k` leaves. In fact 640 leaves add 0.736 and `k` grass adds 0.197, and even `k` crops add 0.632. Brokkr kept the true first clause and replaced the second with a version that holds: with 10·k leaves already, 90·k more leaves add under 0.001, while `k` crops add 0.632. Heimdall accepted it; I agree.
- **The 015 draft** now says "within 256 columns, mixing types beats one type". The surface rule counts at most 256 blocks per chunk, so 256 leaves give 1.96, while 128 leaves plus 128 crops give 2.59, and going from 128 to 256 leaves adds only 0.23. This also means that for blocks the surface rule does most of the anti-spam work in the alpha.
- **Known limitation of the readout (for 014):** when `E ≤ C` a chunk ends at 0 and is pruned with its stats, so `absorbed` cannot be read for a chunk that absorption keeps fully clean. `/pollution rates` and the F3 overlay should show the cached capacity instead, which answers "how much can this chunk absorb" without a field entry. M3 is not affected: its test compares `getLocal`, which reads 0 for a pruned chunk.
- **Process:** red-first by compile error only for several tests. Accepted for pure-maths classes; six mutants show each test fails when its behaviour breaks.

## Out of scope

Sampling, tags, the type list, config keys, the save format and `PollutionManager` wiring (014); GameTests and equilibrium over spread (015); any `r` mechanism (post-alpha).
