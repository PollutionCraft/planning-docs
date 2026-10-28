---
title: "ADR 0017: Absorber types as data, WORLD_SURFACE sampling, and a separate absorber cache record"
status: proposed
owner: Mimir
---

- **Status:** proposed 2026-10-27 (Mimir), for P2 absorption (tasks 013–015). It answers Heimdall's design questions B2, B3, B4, B5, B9, records B7 and B8, and takes in Odin's review constraints (2026-10-28: cache bound to field entries, capacity held per chunk, sampler never loads chunks, `activeTicks` timing). **It amends in part [ADR 0004](../0004-absorption-anti-spam/)** (accepted): the line "Curves and `r` are config only" becomes "curves are data, plus one config multiplier; `r` has no key in the alpha". ADR 0004's D + B + E rule is unchanged. It also replaces architecture 3.2's plan to add the cache as a new column of the field record.
- **User decisions recorded here (2026-10-28):**
  - **B1, blocks only in the alpha:** leaves, grass and plants, crops, water. **No entities, no animals.** This defers the animals part of ADR 0004 B ("Animals are counted per entity type tag"), and B4 (when entities are counted) is moot for now. See [Entity absorption: deferred](#entity-absorption-deferred) for what adding it would need.
  - **B6, placeholders for the P4 playtest, not final values:** `cap`/`k`: leaves 2.0/64, grass 0.5/128, crops 1.0/64, water 0.25/128 (no animals row). `defaultCapacity` 0.5, down from 100. Re-sample period 10 minutes of active ticks. P4 tunes them all.
- **Context. Facts read on 2026-10-27:**
  - **The mod at `871ca21`:**
    - `AbsorptionModel` is `double capacity(long chunkKey)`.
    - `ConfigRegistry` has `emissionMultiplier` (1.0, 0–1,000) and `defaultCapacity` (100, 0–1e9).
    - `FieldCodec.DATA_VERSION = 1`, and `decode` ignores any other version. The loader keeps unreadable records as preserved, and they are not simulated (architecture 3.2).
    - Emitter mappings are data: `data/<ns>/pollution_emitters/<target mod id>/*.json`, overridable by datapacks, reloaded on `/reload` (`docs/emitter-mappings.md`).
  - **NeoForge 21.1.264 sources:**
    - `Heightmap.Types.WORLD_SURFACE` uses `NOT_AIR`.
    - `MOTION_BLOCKING` uses `blocksMotion() || fluid`, and `MOTION_BLOCKING_NO_LEAVES` excludes `LeavesBlock` from that.
    - `LevelChunk.setBlockState` updates `MOTION_BLOCKING`, `MOTION_BLOCKING_NO_LEAVES`, `OCEAN_FLOOR` and `WORLD_SURFACE`, so all four are live on loaded chunks.
    - `ServerLevel.areEntitiesLoaded(long chunkPos)` exists and is public.

## Options and prior art

| Question | Options | Prior art |
| --- | --- | --- |
| B2 Where curve constants live | (a) Config only (ADR 0004 as written): a flat key registry can't hold a set of types that datapacks can extend. (b) **Data, one JSON per type, plus one global config multiplier.** (c) Hard-coded types with config constants. | Factorio puts absorption on the entity prototype (`emissions_per_second`, negative for trees), so it is data that mods change, not a runtime setting ([forum](https://forums.factorio.com/viewtopic.php?p=476763), [wiki: Tree](https://testing-wiki.factorio.com/Tree)). Our own emitter mappings (task 011) are data with a config multiplier. We borrow that split. |
| B3 Which heightmap is the top | `WORLD_SURFACE` (first non-air block); `MOTION_BLOCKING` (skips crops, flowers, short grass, so it would read farmland and grass blocks); `MOTION_BLOCKING_NO_LEAVES` (skips leaves too, which defeats the main absorber) | Factorio counts per tile and per tree, with no vertical axis. ADR 0004 D's player-facing rule is "only what sees the sky". |
| B4 When to sample (entities moot in the alpha) | (a) Inline at `ChunkEvent.Load`. (b) **Only in the round-robin pass; chunk load only queues.** For entities, later: (c) count them in that pass once `areEntitiesLoaded(chunk)` is true; (d) entity join and leave events with live counts. | — |
| B5 Where the cache is saved | (a) A new column in the field record, `dataVersion` 1 → 2: needs a real migration, and today's loader would preserve, and so freeze, a v2 field on an older mod. (b) **A separate per-dimension record, `pollutioncraft_absorbers`, with its own version 1.** (c) Not saved: unloaded chunks fall back to `defaultCapacity`, which is wrong exactly where it matters (the forest around a chunk-loaded base, sampled while the player was there). | Minecraft itself splits derived data, such as POI, from chunk data. **Assumption:** stated from general knowledge, not read this session. |

## Decision

1. **B2: absorber types are data. Constants are per type, plus one global multiplier.**
   - One file per type: `data/<namespace>/pollution_absorbers/<target mod id>/<type>.json`. The path convention mirrors the emitter mappings, and vanilla types ship in the `minecraft` compat area ([ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/) §2). The type id is the file's resource id.
   - Fields: `blocks` (a block tag id, required), `cap` (PU per interval, finite and ≥ 0), and `k` (finite and > 0). An `entities` field (an entity-type tag) is **not** in the alpha format (B1). Adding it later is an additive format change.
   - The tags are architecture 3.5's `pollutioncraft:absorbers/<type>`, shipped as data next to the type files. A tag may include vanilla tags such as `#minecraft:leaves`.
   - Errors and overrides follow `docs/emitter-mappings.md`: an invalid file is skipped with one log line, a datapack overrides by replacing the path, and files load on server start and `/reload`.
   - Core owns the format and the curve (task 013). Core alone ships no types.
   - **B8:** a config key `absorptionMultiplier` (default 1.0, bounds 0 to 1,000, tunable with `/pollution tune`) multiplies every capacity, `defaultCapacity` included, so one knob scales absorption everywhere. `defaultCapacity` stays a separate key.
2. **B3: `Heightmap.Types.WORLD_SURFACE`.** The sampled block is the one at `getHeight(WORLD_SURFACE, x, z) − 1` in each of the 256 columns.
   - It sees crops, flowers, grass, leaves and the water surface, which is the "what sees the sky" rule.
   - It also sees snow layers, carpets, torches, glass and any roof. So building over the ground covers its absorbers. That is thematic, and the alpha accepts it (R6, P2 playtest).
   - Only the top block counts. A grass block under short grass does not count twice.
3. **B4 and sampler rules: every sample happens in one round-robin pass, never inline at chunk load.**
   - **Chunk load only queues the chunk.** The queue serves first loaded chunks with no sample this session, then chunks whose sample is older than the re-sample period (10 minutes = 12,000 `activeTicks`).
   - **Rate:** at most one chunk per server tick. This bounds the cost, so a login that loads hundreds of chunks causes no spike. Until a chunk is sampled, it uses its cached capacity, or `defaultCapacity` if it has none.
   - **It never loads or generates a chunk.** It reads only chunks already loaded (`ServerChunkCache.getChunkNow`, which returns null otherwise), and a queued chunk that has unloaded is dropped from the queue.
   - **It runs only while a player is online**, and all its timing is in `activeTicks` (architecture 3.2, 3.6). With nobody online it does nothing, and samples do not age.
   - **Capacity is computed at sample time, not each interval.** A sample produces per-type counts and, from them, the chunk's capacity before the multiplier, held as one `double` per chunk. The interval step only reads it and multiplies by `absorptionMultiplier`, so a tune change applies at once. On `/reload` of the types, the capacities of every cached chunk, loaded or not, are recomputed from their stored counts (curve changes apply at once), and loaded chunks are marked stale so the queue re-samples them (tag changes apply on re-sample).
   - **Entities: none in the alpha** (B1); see [Entity absorption: deferred](#entity-absorption-deferred).
4. **B5: the cache is its own record, so the field record stays version 1 and needs no migration.**
   - **Retention: one cache entry per chunk that has a field entry.** A loaded chunk keeps its sample in memory. When it unloads, the sample is kept only if the chunk has a field entry, and an entry is dropped when its field chunk is pruned. So the cache is bounded by the field, not by explored area: an explored 20,000-chunk world adds nothing for chunks with no pollution.
   - **Accepted gap:** a chunk that was sampled while clean, then unloaded, and that pollution reaches while it is unloaded, uses `defaultCapacity` until it is loaded again. Pollution spreads one ring per interval from where it is emitted, and the area around an active player is loaded and sampled, so this mainly affects bases left chunk-loaded while the player is away. It heals on the next visit.
   - **Record:** `pollutioncraft_absorbers`, per dimension, in that dimension's data storage. It holds:
     - `dataVersion` (int, 1);
     - `types`, a list of type-id strings;
     - `keys`, a `long[]` of packed `ChunkPos`, sorted, a subset of the field's keys at save time;
     - `counts`, an `int[]` of length `keys × types`, row-major.
     About 24 B per entry with 4 types (8 B key, 4 × 4 B counts), or about 60 KB raw at 2,500 field chunks.
   - **What is stored:** counts, not capacity. Capacity is recomputed on load, so curve changes made while the server was down apply. `sampledAt` is not saved: a chunk loaded in a new session counts as "not sampled this session" and is re-sampled first.
   - **On load:**
     - a type id that no longer exists is dropped, with one log line;
     - a row with a negative count, or a key with no field entry, is skipped and logged;
     - a missing or unreadable record (a future version, a bad shape) means an empty cache, with one log line, and **it is overwritten on the next save**.
   - That last rule is a deliberate exception to the downgrade-protection rule in architecture 3.2. The cache is derived data that the game rebuilds by re-sampling. Losing it costs accuracy (unloaded chunks use `defaultCapacity` until they are next loaded), never pollution or `pressure`. The field and world records keep their protection unchanged.
5. **B9: no `r` key and no residual-split code in the alpha.** Emissions land in `absorbable`, and `persistent` stays 0. The `persistent` column stays in the save format (ADR 0004 E). The key and the split arrive with the cutoff stage (M7), with a per-tier `r`. A key fixed at 0 would be a dead knob. 013 tests the invariant.
6. **B7, sampler cost (recorded from Heimdall):** at most **0.05 ms/tick averaged** for the round-robin pass, and at most **0.5 ms for one chunk sample** (blocks only in the alpha; an entity query later must fit the same ceiling). Because of rule 3 there is no separate chunk-load cost. It is separate from the 0.5 ms/tick field budget and inside the 2 ms/tick total. 014 measures it.

## User decisions this design depends on

B1 and B6 are decided (Status above). The shipped vanilla data is four type files (`leaves`, `grass`, `crops`, `water`) with the placeholder numbers, and `defaultCapacity` changes from 100 to 0.5 in 014. Brief M3 is being reworded by Odin to "after N intervals, local pollution is lower than the same source without absorbers". This design meets that with blocks only. The brief should also say that mobs and animals are deferred (project-owner).

## Entity absorption: deferred

Not in the alpha (user, B1). Adding it later needs:
- **Format:** an optional `entities` field (an entity-type tag) in the type file, additive, with tags `pollutioncraft:absorbers/<type>` for entity types.
- **Sampling:** counted in the same round-robin pass, only when `ServerLevel.areEntitiesLoaded(chunk)` is true (entities load after the chunk in 1.21.1), as tagged `LivingEntity` types in the whole chunk column. Until then a sample keeps the previous entity counts and the chunk stays queued. If counts lag, entity join and leave events with live counts are the alternative.
- **Budget:** the entity query must fit the 0.5 ms single-sample ceiling.
- **Save:** one more `types` column, no format change.
- **Design:** which mobs count (the B1 question, including hostile mobs, villagers and players). The soft cap per type is what handles animal farms (ADR 0004 B).

## Consequences

- **Benefits:**
  - No save migration, and older mods are unaffected.
  - Tuning and pack overrides work like the emitter mappings.
  - A chunk-load burst has no cost spike.
  - Curve and multiplier changes apply without re-sampling.
  - The cache size is bounded by the field, not by explored area.
  - The interval step does one multiply per chunk; no curve maths per interval.
- **Costs:**
  - A second save file per dimension.
  - A third data format (types), with its own documentation (`docs/absorbers.md`, task 014).
  - Samples lag chunk load by up to the queue length in ticks (about 20 s for 400 chunks).
  - After a downgrade and an upgrade, the cache is rebuilt.
  - The retention gap in rule 4 (a clean chunk polluted while unloaded uses `defaultCapacity`).
- **Risks:**
  - `WORLD_SURFACE` treats snow layers and carpets as the top (R6).
  - The retention gap could matter more than expected for bases left chunk-loaded for long periods (Revisit if).

## Blast radius / reversibility

ADR 0004 (one line), architecture 3.2, 3.3, 3.5 and 5, and tasks 013–015. No shipped code. Moving the cache into the field record later is a v1 → v2 migration, the same cost as option (a) today. Changing the heightmap is a single-line change plus re-sampling. **Cheap to reverse.**

## Revisit if

- Playtests show forests around a chunk-loaded base not absorbing while the player is away: keep samples for the 4 neighbours of field chunks as well.
- The P2 playtest shows that snow or carpets hide absorbers too often: read the first non-`replaceable` block below.
- The cutoff stage (M7) is defined: add `r` per tier.
- Entity types are added after the alpha: see [Entity absorption: deferred](#entity-absorption-deferred).

## Sources

- Mod repo `pollutioncraft` at `871ca21`: `core/…/AbsorptionModel.java`, `core/…/FieldCodec.java`, `mod/…/FieldNbt.java`, `mod/…/config/ConfigRegistry.java`, `docs/emitter-mappings.md`.
- `neoforge-21.1.264-sources.jar`: `Heightmap`, `LevelChunk`, `ChunkStatus` (`FINAL_HEIGHTMAPS`), `ServerLevel.areEntitiesLoaded`, `ServerChunkCache.getChunkNow`.
- Heimdall's P2 draft, part B (2026-10-27); Odin's review of it (via the team lead, 2026-10-28).
- [Factorio forum: emissions in the control stage](https://forums.factorio.com/viewtopic.php?p=476763); [Factorio wiki: Tree](https://testing-wiki.factorio.com/Tree).
