---
title: Glossary
---

| Term | Meaning |
| --- | --- |
| Local pollution | Pollution stored per Minecraft chunk (16×16 blocks, full height), per dimension. Spreads, is absorbed, and gates mob aggression. See [Architecture](../../design/architecture/). |
| Global pressure | World-level value in [0, 1), from active ticks and gross emission. Never decreases. Scales aggression threshold and intensity; never triggers attacks alone. Proposed in ADR 0002. |
| Gross emission | Total pollution ever emitted. Absorption does not reduce it. |
| Persistent pollution | Part of local pollution that absorbers cannot remove; only fixed decay removes it. Used for the M7 cutoff (ADR 0004). |
| Siege | Mob behaviour in an aggressive chunk: path to the pollution source and break blocks to reach it (M4, ADR 0006). |
| Emitter / absorber | A block or entity that adds / removes local pollution. |
| Active ticks | Server ticks counted only while at least one player is online. Drives global pressure (ADR 0002). |
| Siege group | Persistent mobs the mod spawns in an aggressive loaded chunk, paid for from local pollution (ADR 0008, proposed). |
| PU | Pollution unit; dimensionless. Scale (user decision): 1 PU is one lit furnace's output for one interval (1 s at the default 20 ticks). |
