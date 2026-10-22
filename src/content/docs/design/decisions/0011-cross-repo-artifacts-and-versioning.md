---
title: "ADR 0011: Cross-repo artifacts, versioning, and release coordination"
status: proposed
owner: Mimir
---

- **Status:** proposed overall. **§4 (hosting) is decided by the user (2026-10-22): two-tier publishing**, superseding my earlier GitHub Pages recommendation. §1 (one artifact per repo) is decided by the user (2026-10-22). §§2–3 and 5–7 remain proposed for engineering-lead and user confirmation. §8: platform releases during the alpha are deferred (switchable), and AI disclosure is decided, with a Modrinth rule conflict flagged. The third-party compile route is still open.
- **Context:** [ADR 0010](../0010-four-repositories/) splits core, compat, gap-filler, and pack into separate repos. Compat must compile against core's public API **and against the gap-filler's artifact** across repos. Per [ADR 0012](../0012-independent-gap-filler-and-compat-as-integration-layer/), core and the gap-filler depend on nothing; compat depends on both. The pack must pin a working combination.

## Prior art

- **GTM** publishes `com.gregtechceu.gtceu:gtceu-${mc_version}:${gtm_version}` to its own Maven repository, and addons depend on it. **Fact:** stated in the GTM README. We borrow the coordinates pattern (MC version in the artifact id).
- **GitHub Packages (Maven):** needs an access token **even to download public packages**, and only classic personal access tokens. **Fact:** per GitHub's docs. That is friction for outside contributors.
- **Modrinth Maven** (`https://api.modrinth.com/maven`): every uploaded project version is available without auth, as `maven.modrinth:<project>:<version>`. It has no transitive dependency metadata, and only uploaded releases appear, no snapshots. **Fact:** per Modrinth's docs.
- **CurseMaven** (`cursemaven.com`, third-party): resolves any CurseForge file anonymously as `curse.maven:<slug>-<projectId>:<fileId>`. **Fact:** per cursemaven.com and the Forge community wiki. It only serves what is uploaded, i.e. our full mod jars.
- **Modrinth content rules** (read 2026-10-22):
  - licence metadata must be correct (§5.1);
  - every dependency must be declared per version (§5.6);
  - "additional files" are for designated purposes such as source jars, and files with different functionality belong in separate projects (§5.8);
  - AI-generated content must be disclosed, and **projects that are primarily or entirely AI output can't be published** (§6.1–6.2).

## Decisions to make

### 1. What the dependents compile against: one artifact per repo (decided by the user, 2026-10-22)

| Option | For | Against |
| --- | --- | --- |
| **One artifact per repo: the full mod jar, which contains the `…api.*` packages** | Simplest deployment: 1 repo = 1 artifact. Nothing extra to publish, host, or version. | Internals sit on dependents' compile classpath, so the compiler no longer enforces "import only `api`". Build checks must do it instead (below). |
| A separate `pollutioncraft-api` artifact, or an `api` classifier jar | The compiler enforces the contract | More to publish and host. Deferred (see Revisit if). |

**Decision:** every repo publishes **exactly one artifact**.
- Core publishes only **`pollutioncraft-1.21.1`**: the full mod jar, including the `…api.*` packages. There is no separate API artifact and no classifier jar for now.
- Compat and third parties compile against that jar.
- Compat and the gap-filler each publish only their own mod jar.

Inside the core-mod repo, `api` may still be a separate source set or subproject for structure; it is bundled into the single jar, not published.

**Enforcing the contract without the compiler:**

| Check | Where | Rule |
| --- | --- | --- |
| **API purity** | core CI | Classes in `…pollutioncraft.api.*` must not reference `…pollutioncraft.core.*`, `…pollutioncraft.mod.*` (or any non-API package of ours), or `…compat.*`. They may reference Minecraft, NeoForge, and the JDK. This keeps the public surface self-contained, so splitting it into its own artifact later is a move, not a redesign. |
| **Adapter imports** | core CI (alpha, for `…compat.*` inside core) and compat CI (after the split) | Adapter code may import only `…pollutioncraft.api.*` from our mod. Any other `pollutioncraft` package fails the build. |
| **API compatibility** | core CI | A binary-compatibility diff of the `…api.*` packages of the jar against the last release. A non-MAJOR release that breaks them fails. Engineering picks the tool; **assumption:** it can filter by package. |
| **Marking internals** | core | Internal packages are documented as such (and optionally annotated). Only `…api.*` is covered by semver. |

### 2. Where the plain-Java `core` library lives

**Recommendation:** a subproject in the core-mod repo, **internal, not a public dependency.** It is bundled inside the core mod jar. Its classes are on dependents' classpath (one-artifact rule), but dependents must not use them: the adapter-import check enforces this. It shares the core mod's version. If another consumer ever needs it, publish it as its own artifact then (YAGNI until then).

### 3. Versioning

**Recommendation:** one semantic version line per repo (one artifact each). For core, **semver covers only the `…api.*` packages**:
- **MAJOR:** an incompatible API change.
- **MINOR:** API additions.
- **PATCH:** fixes with no API change.

Pre-1.0 (alpha), MINOR may break: we use `0.x`, and dependents pin `[0.N, 0.N+1)`.

CI checks binary compatibility of the `…api.*` packages against the last release (see §1). **Assumption:** a JVM API-diff tool such as japicmp fits our Gradle setup; engineering picks one.

Dependents declare:
- a **compile** dependency on an exact version of the core mod jar;
- a **runtime** dependency in their mod metadata with a version range `[X.Y, X+1)`, so the loader refuses a mismatched core with a clear error. **Assumption:** both Forge and NeoForge mod metadata support Maven-style `versionRange`; verify in task 001.

### 4. Hosting: two-tier publishing (decided by the user)

**Fact (user-verified):** GitHub's Maven/Gradle registry needs at least a PAT to download even public packages; only container images are anonymous. This matches GitHub's docs (classic PAT with `read:packages`; `GITHUB_TOKEN` works in Actions when the consuming repo has been granted access to the package).

| Tier | What | Where | Who consumes it | Auth to read |
| --- | --- | --- | --- | --- |
| **1. Snapshots** | `-SNAPSHOT` builds from `main` | **GitHub Packages** (Maven) | Our own repos' CI (compat nightly) and developers | `GITHUB_TOKEN` in CI (with package access granted to the consuming repo); a classic PAT with `read:packages` locally |
| **2. Releases** | Tagged `vX.Y.Z` | **GitHub Packages + CurseForge + Modrinth** (plus a GitHub Release with the jars attached) | Players, the pack, compat, third-party addons | GitHub Packages: token. CurseForge and Modrinth: anonymous (including CurseMaven and Modrinth Maven). |

**Which artifact goes where** (one artifact per repo, §1):

| Artifact | GitHub Packages (tiers 1+2) | GitHub Release | Modrinth | CurseForge |
| --- | --- | --- | --- | --- |
| `pollutioncraft-1.21.1` (full mod, contains `…api.*`) (+ sources jar as a standard attachment) | Yes | Yes | Yes, if platform publishing is on (§8.1, §8.2) | Yes, if on (§8.1) |
| compat mod jar | Yes | Yes | Same | Same |
| gap-filler mod jar | Yes | Yes | Same | Same |

The sources jar is the usual Maven attachment and a Modrinth "additional file" for its designated purpose; it is not a second artifact in the sense of this rule.

**How compat and third-party addons compile:** against **the same jar**, from wherever it is published:

| Source | Anonymous? | Snapshots? | Use |
| --- | --- | --- | --- |
| GitHub Packages | No (classic PAT with `read:packages`; `GITHUB_TOKEN` in CI with package access granted) | Yes | **Our compat repo** (pinned releases, plus nightly snapshots). Third parties who accept a token. |
| Modrinth Maven / CurseMaven | Yes | No | Third parties, **only once platform publishing is on** (§8.1), and Modrinth only if allowed (§8.2) |

Compat keeps the full mod jar on its runtime classpath for GameTests, as before.

### 5. Cross-repo CI and release coordination

| Repo | CI on every push | Scheduled | Release |
| --- | --- | --- | --- |
| core | Build, unit tests, GameTests, API compatibility check. On `main`: publish the `-SNAPSHOT` mod jar to GitHub Packages. | — | Tag `vX.Y.Z`: tier-2 release workflow (below) |
| gap-filler | Build and test standalone (no core). On `main`: snapshots to GitHub Packages. | — | Tag: same tier-2 workflow |
| compat | Build and test against the **pinned** core and gap-filler jars (GitHub Packages, `GITHUB_TOKEN`), plus the adapter-import check | Nightly build against core's and the gap-filler's latest **snapshots** | Tag, after bumping pins and ranges: same tier-2 workflow |
| pack | packwiz refresh plus the dedicated-server smoke test | — | Tag, after updating pins |

**Release workflow shape (same in core, compat, and gap-filler):**
1. Trigger: a push of tag `v*`, running in a protected GitHub **environment** (`release`) with required reviewers. It never runs on pull requests or forks.
2. Job `verify`: build, unit tests, GameTests, and the API compatibility check (core only).
3. Job `maven`: publish release artifacts to GitHub Packages.
4. Job `github-release`: create the GitHub Release and attach the mod jar (and sources).
5. Jobs `modrinth` and `curseforge` (parallel): upload the mod jar with version, loader, MC version, release channel (`alpha` while `0.x`), changelog, licence, and **declared dependencies**. For compat, these are core (required) and GTM, gap-filler, … (optional).
6. Each upload job can be re-run on its own. Release versions are never overwritten; a broken release is fixed with a new PATCH.

The upload tooling (a Gradle plugin or a GitHub Action) is engineering's choice. **Assumption:** maintained options exist for both platforms; verify in task 026.

**Secrets and permissions** (least privilege, per repo):

| Item | Where | Scope |
| --- | --- | --- |
| `GITHUB_TOKEN` | Snapshot workflow on `main` | `permissions: contents: read, packages: write` |
| `GITHUB_TOKEN` | Release workflow | `contents: write` (GitHub Release), `packages: write` |
| `GITHUB_TOKEN` | Compat CI (reading core/gap-filler packages) | `packages: read`, **plus** granting the compat repo read access in each package's settings |
| `MODRINTH_TOKEN` | `release` environment secret | A personal token limited to creating versions |
| `CURSEFORGE_TOKEN` | `release` environment secret | A CurseForge upload API token |
| Modrinth project id, CurseForge project id | Repo **variables** (not secrets) | — |
| Developer PAT (classic, `read:packages`) | `~/.gradle/gradle.properties`, **never committed** | Local builds of compat against snapshots |

Platform tokens exist only in the protected `release` environment, so workflows on pull requests can't read them.

**Release order:** core and gap-filler (independent of each other) → compat → pack.
- A core change that compat needs ships in two steps: core release, then a compat PR that bumps the pin.
- The pack's release notes record the exact trio of versions. That list is the supported-combination matrix.

### 6. How the pack pins our mods

The same as third-party mods: packwiz entries with an exact version and hash.
- **Sources:** the Modrinth release (preferred), or the CurseForge file, or the GitHub Release asset URL.
- **Never GitHub Packages.** It needs a token, which players' installers don't have.
- Our mods being on CurseForge and Modrinth also lets the pack's `.mrpack` and CurseForge exports reference them as platform projects, instead of bundling them as external files.
- The pack's smoke test is the integration test for the exact combination. The pack never uses ranges.

### 7. Licence per repo

Unchanged ([ADR 0009](../0009-licensing/)): each mod repo is LGPL-3.0 (with the GPL-3.0 text). Published POMs and the Modrinth and CurseForge licence fields declare LGPL-3.0. The pack repo is MIT.

### 8. Publishing our own mods to CurseForge and Modrinth

**The earlier rules research was about modpacks.** It covered external files inside `.mrpack`, and non-CurseForge mods in CurseForge packs. Our own mods are first-party uploads, so those constraints don't apply to them. Licence (LGPL-3.0), dependency declarations, and source links are straightforward.

#### 8.1 Platform releases during the alpha: deferred (user, 2026-10-22)

- **Ideal:** publish to CurseForge and Modrinth only once GTM has a numbered 1.21.1 release. The user may not be able to wait, so the decision is **deferred** until pack development is further along.
- **Consequence for the build:** the `modrinth` and `curseforge` release jobs must be **switchable** (for example a repo variable `PUBLISH_PLATFORMS=false` by default). Tier 2 then means GitHub Packages and GitHub Releases until the switch is flipped.
- Whenever we do publish: the GTM adapter checks the GTM version and stays inactive outside the supported range. Players can then only download GTM 7.0.2 from the platforms while we build against 8.0.

#### 8.2 AI-generated content: we disclose (user decision, 2026-10-22)

- **Decision:** this project's code will most likely be majority AI-generated. **We disclose it accurately on every platform that asks**, including Modrinth's "Contains AI-generated content" flag, and we keep the disclosure up to date.
- **The user's reading:** Modrinth requires disclosure of majority-AI content; it does not ban it.

> **Conflict to resolve before the first Modrinth upload.** I re-read Modrinth's content rules (last modified 2026-08-13) on 2026-10-22. They say more than disclosure:
> - §6: "Projects cannot be entirely or primarily comprised of content created or derived from generative AI output."
> - §6.2: "Projects may not be published publicly if the contents are primarily or entirely a product of AI output."
> - Modrinth's AI-policy announcement also says it "will not permit the upload of content that is entirely or primarily AI-generated" (mob AI and data-generation scripts are excluded from that term).
>
> If our code is majority AI output, **public publishing on Modrinth is likely not allowed**, disclosure or not. Before the first upload, re-check the then-current wording and, if still unclear, ask Modrinth support whether AI-assisted code with human design and review counts as "primarily AI output".
>
> **If Modrinth is unavailable:**
> - Tier 2 is GitHub Packages, GitHub Releases, and CurseForge.
> - The pack pins our mods from the GitHub Release asset, or CurseForge, instead of Modrinth (§6).
> - Third parties lose the anonymous Modrinth Maven route, but CurseMaven remains.

- **CurseForge's AI policy is unchecked.** A search on 2026-10-22 found no CurseForge statement. Check its current terms and moderation guidelines before the first upload.
- Modrinth also bans AI-generated images on project pages (§6.2). Our icons and screenshots must not be AI-generated.

#### 8.3 Third-party compile route: open (user), narrowed by the one-artifact rule

With one artifact, every third party compiles against the same full jar. The only question left is **where** they may get it, and whether we document that officially:
- **GitHub Packages**, with a PAT. Always available, snapshots included.
- **Anonymously from CurseMaven or Modrinth Maven.** Only after platform publishing is switched on (§8.1), and Modrinth only if allowed (§8.2).

Either way, only `…api.*` is covered by semver; everything else is internal.

**Recommendation:** document GitHub Packages from the first release, and add the anonymous routes when platform publishing starts.

- **Assumption:** both platforms review new projects before they are public, so the first release has a lead time.

## Consequences

- Clear contracts, and independent releases with early warning of breakage.
- Costs: an extra artifact, a publish pipeline, an API-diff check, and two-step changes across repos.

## Blast radius / reversibility

Build and CI of all repos. Changing the Maven host later means updating repository URLs and tokens in the dependents. Cheap. Leaving CurseForge or Modrinth later doesn't break the pack if it pins from GitHub Releases instead.

## Revisit if

- Lockstep releases become routine. Then consider merging repos (supersede ADR 0010).
- **Compat splits out of core, or third-party addons appear:** consider publishing an `api` classifier jar or a separate `pollutioncraft-api-1.21.1` artifact, so the compiler enforces the contract again. The API-purity check makes this a packaging change only.
- Token friction blocks contributors. Then add an anonymous mirror for `api` (for example a static Maven repository).
- A platform rejects a project (for example under Modrinth's AI rule).

## Sources

- [GitHub Packages: Maven registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-apache-maven-registry)
- [Modrinth Maven](https://docs.modrinth.com/docs/tutorials/maven/), [CurseMaven](https://www.cursemaven.com/source)
- [Modrinth content rules](https://modrinth.com/legal/rules) (last modified 2026-08-13; read 2026-10-22)
- [Modrinth: AI policy and disclosures](https://modrinth.com/news/article/ai-policy-and-disclosures/)
