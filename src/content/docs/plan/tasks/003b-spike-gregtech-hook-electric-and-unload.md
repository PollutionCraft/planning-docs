---
title: "003b: Spike: GregTech hook, electric machines and unload"
status: proposed
owner: Heimdall
---

**Blocked by:** nothing; spike [003](../003-spike-gregtech-activity-hook/) is accepted ([findings](../003-findings/)). **Blocks:** the design gate (step 0) of task [012](../012-gtm-activity-adapter/). It can run in parallel with P2 absorption. **Origin:** the four things 003 left unproven ([findings, Before 012](../003-findings/#before-012)) and the assumption in [ADR 0016](../../../design/decisions/0016-gtm-activity-hook-shape/) decision 3.

A short, timeboxed, **headless** follow-up. Same rules as 003: Sindri, throwaway branch, GTM only in the run's `mods/` folder and never on a compile classpath, nothing merged, and no code copied into production. Deliverable: a short findings note appended to the 003 findings page (or `003b-findings.md`).

## Goal

Answer, with evidence from running code against the **pinned GTM snapshot** (`8.0.0-SNAPSHOT+36a6b38`, the jar hash from the pack pin):

1. **Electric single-block machine.** Power it headless (spike 006 used `gtceu:creative_energy` at 32 V for an LV electric furnace). The hook gives exactly one working and one idle event at its position, after per-position de-duplication.
2. **Electric multiblock with a muffler hatch.** Form one and run it. The hook gives the same behaviour at the controller. Record whether the muffler adds any event of its own (it should not matter for the hook).
3. **Chunk unload of a working machine.** Does any hook event fire? What is observable instead (block-entity removal, `ChunkEvent.Unload`, the machine's own invalid/unload callback)? **Does the machine call `setStatus(WORKING)` again after the chunk reloads** (re-announce), with its recipe still running? This is the assumption behind [ADR 0016](../../../design/decisions/0016-gtm-activity-hook-shape/) decision 3 and its first "revisit if".
4. **Block break of a working machine.** Same questions: any hook event, and what is observable.
5. **Other `Status` values and edge cases** seen on the way: `WAITING` and `SUSPEND` (already observed as not working), a machine losing power mid-recipe, a generator machine (does it report WORKING while producing power?). Record, do not decide.
6. **Interface methods called through the mixin's interface:** call each of `isWorking()`, `getBlockPos()`, `getLevel()` on an electric single block and a multiblock controller, to confirm interface dispatch holds for all machine shapes (ADR 0016 decision 1).
7. **Client side, prepared for the user:** the probe build for the manual check below. Headless, the spike cannot show it.

## Conditions

- Red first where it applies: each probe GameTest is written to fail (no event) before the machine is driven. Paste the failing line.
- Report what is **not** shown. Do not call an untested shape "works".
- Out of scope: production code, rates, pollution logic, the version-gate bump procedure.
- If any result refutes ADR 0016, say so first in the note; Mimir revises the ADR before 012 is briefed.

## The client-side check (the user's, manual)

The client side cannot run headless. The user runs it once, in the **separate dev Prism instance** of the pack (architecture 3.7, never in a tester world). Sindri prepares the probe build and tells the user when it is ready; the steps below are the check. Details marked **(Sindri confirms)** depend on the probe build and 003b's machine choice.

**Sindri's preparation (part of this task):** on the spike branch, make the probe log one line for **every** handler call, with the side and the thread, in this form: `GT_PROBE side=SERVER|CLIENT thread=<name> pos=<x,y,z> status=<working|idle>`. Build the jar, copy it into the dev instance with `./gradlew deployToDevInstance` (or by hand), and write the machine to build (the one 003b proved, with the exact recipe and the command to give the items) into the note. Check that the dev instance has GTM from the pack pin.

**Steps for the user:**
1. Start the dev instance. Create a **new singleplayer creative world** (a singleplayer world runs the client and the integrated server in one game, so one log shows both sides).
2. Build the machine from Sindri's note: a powered electric machine, then run it so it works and goes idle. **(Sindri confirms: item commands and layout.)** Let it run for about 30 seconds and stop it.
3. Quit the game. Open `logs/latest.log` in the dev instance. Search for `GT_PROBE`.
4. Count the lines by `side=`. Send Sindri or Odin: the number of `side=SERVER` lines, the number of `side=CLIENT` lines, and the first three lines of each.
5. Repeat once as a **multiplayer join**: start the dev instance's dedicated server with the same probe jar, join it with the client (which has the same jar), run the machine, and count `GT_PROBE` lines in the **client** log. A client-side line here would be a real client-side call.

**How to read the result.** `side=SERVER` lines must show exactly one line per real working or idle change. `side=CLIENT` lines may appear: the bytecode says the early `isRemote()` return is also a `RETURN`, so the handler can be reached on the client. Either result is acceptable. What matters is that it is recorded: 012's handler ignores client levels in any case, and its with-targets test must prove it. If `side=CLIENT` lines appear, 012 needs a test that a client-side call changes nothing. If none appear, the guard stays anyway.

## Commands

`./gradlew build runGameTestServer` on the spike branch, with GTM in `mod/run/gametest/mods/` only.

## Out of scope

Production code. The adapter (012). Rates. A real-pack performance profile (P4).
