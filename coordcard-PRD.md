# PRD: CoordCard — Coordinated YouTube Comment Cluster Detector (MV3 Chrome Extension)

## 0. Document Status
- **Mode**: Autonomous-execution PRD for "ralphthon" harness, 90-minute hard budget.
- **All acceptance predicates are binary-observable.** No "looks good", no "polished", no "beautiful".
- **All human checkpoints are pre-sealed** (Section 8: Scope-Cut Policy + Section 11: Demo Path). The harness must not prompt a human mid-run.

---

## 0.1 Environment Contract (PRE-SEALED — autonomous run assumptions)

The harness run assumes EXACTLY this environment; the agent must not negotiate or guess:
- **Node**: 20.x LTS (≥ 20.11). Verify with `node -v` at preflight; if absent, install via the system package manager is OUT OF SCOPE — preflight FAILS loudly instead of guessing.
- **Package manager**: pnpm 9.x via Corepack (`corepack enable && corepack prepare pnpm@9 --activate`). Use `pnpm` exclusively (never npm/yarn).
- **Internet**: npm registry access IS available during the run for `pnpm install`. No other network calls are required by the build/tests (all tests run offline against the §5.1 synthetic fixture). The YouTube Data API is NEVER called during build or tests — it is a runtime-only optional feature behind a user-supplied key.
- **OS**: macOS or Linux; all scripts POSIX `sh`/`bash`. No PowerShell.
- **No global installs** beyond Corepack-managed pnpm. All project deps are local devDependencies, pinned in `package.json` + `pnpm-lock.yaml` (lockfile committed after first install so re-runs are deterministic).
- **Chrome**: NOT required during the 90-min run (see §10.B). Only the post-run human demo needs Chrome.

If any preflight assumption fails, the agent writes the failure to `SHIP.md` and stops — it does NOT improvise an alternate toolchain.

---

## 1. Background & Justification (cited facts only)

| Fact | Source |
|---|---|
| Google TAG Q1 2026 terminated 2,254 + 2,602 + 1,096 PRC-linked YouTube channels in a single quarter. | blog.google/security/influence-operations-bulletin-q1-2026/ |
| Of DRAGONBRIDGE/Spamouflage channels: 80% had 0 subscribers, 65% of videos had <100 views; comment loops occurred among their own accounts. | Google TAG |
| Mandiant 2022: impersonator accounts were batch-created in the same month, shared avatars, posted near-identical text. | Mandiant |
| Korea NIS 2023: Chinese firms ran 38 fake Korean news sites. | NIS |
| Korea academic study, 2024: 239 suspected-Chinese YouTube accounts identified; one article got 2,698 comments; one account posted 130 comments/day. | yna.co.kr/view/AEN20240927004100320 |

These facts justify the *problem*. They do **not** justify labeling any individual commenter — see §4 honesty constraint.

---

## 2. Problem Statement & Solution

**Problem (user POV).** A Korean/English-speaking YouTube viewer opens a politically or commercially sensitive video and sees what feels like a coordinated swarm in the comments — near-identical phrases, fresh accounts, bursts of agreement. They have no tool to verify or filter the pattern. Existing YouTube tooling (report button) is per-comment and gives the viewer zero evidence.

**Solution.** A Chrome MV3 extension. One toolbar click runs cluster detection over the visible comment section of the current video. Coordinated clusters get red-carded **with concrete evidence inline** (e.g., "8 near-duplicate comments within 2 min; 6 accounts <30 days old"). The viewer can block any author, export/import shared blocklists, and trigger a semi-automatic report. **Individual comments outside a detected cluster are never flagged** — that is a category error.

---

## 3. User Stories

| # | As a … | I want … | so that … |
|---|---|---|---|
| US-1 | viewer | a toolbar button to scan the current YouTube video's comments | I can audit a suspicious thread in one click |
| US-2 | viewer | red badges on comments that belong to a detected coordinated cluster | I can recognize coordinated activity at a glance |
| US-3 | viewer | each red badge to display the exact evidence (cluster size, signals) | I can verify and trust the flag, not take it on faith |
| US-4 | viewer | comments that are *not* in a detected cluster to remain unflagged | I am not misled into thinking every disagreement is a bot |
| US-5 | viewer | a label that says "matches coordinated-posting patterns in this video", never "bot"/"foreigner"/"Chinese" | I am not led to defame an individual |
| US-6 | viewer | a click on a red-carded author's name to open a profile card | I can sanity-check the account (age, uploads, subs) |
| US-7 | viewer | a "Block author" button | their comments disappear immediately and stay hidden on scroll/SPA nav |
| US-8 | viewer | export my blocklist as JSON | I can share it with friends |
| US-9 | viewer | import a JSON blocklist | I can subscribe to a curated list |
| US-10 | viewer | a "Copy evidence + open report form" button | I can file a report to YouTube/KCSC with prefilled evidence in clipboard |
| US-11 | viewer | scanning to finish in under 2 s for ~300 comments | the UX is not painful |
| US-12 | viewer | the extension to work without an API key by default | I am not blocked by a Google Cloud setup |
| US-13 | viewer | optionally paste a YouTube Data API key | profile cards get richer metadata |

---

## 4. Scoring Algorithm (binding spec)

> **Algorithm v2 — rationale (binding):** v1 (word-3gram Jaccard + handle-randomness in the score) was rigorously critiqued (Oracle + sensitivity calc) and found to be a NARROW "lexically-identical burst detector": it missed paraphrase campaigns (Jaccard never even clusters them), missed normal-handle copy-paste brigades (off by 0.025 because handle-randomness `H` decided the flag), and false-flagged fan chants / RIP storms. v2 fixes this with: (1) **char-level** text similarity (catches paraphrase/spacing/homoglyph), (2) **reply-ring** signal replacing handle-randomness, (3) an **organic-burst suppressor** (prevents defaming fan chants), (4) **no-API / API mode split**. Sources: Oracle review, arxiv 2108.04921, ICWSM 42682, yt-comments-extractor, @nlptools/distance.

### 4.1 Signals (pure functions, unit-testable)

**Cluster construction (char-level, replaces word-3gram).**
- Normalize each comment: lowercase; strip URLs; strip emoji; strip punctuation; collapse whitespace; NFKC.
- **Skip** comments whose normalized token count < 5 (short comments = noise: "ㅋㅋㅋ", "lol", "👍").
- Build **character 4-gram** sets per comment. Pairwise **Jaccard on char-4grams**: `sim(a,b) = |A∩B| / |A∪B|`. Char-grams catch paraphrase, re-spacing, homoglyph, and word-reorder that word-3gram misses.
- Pair is "near-dup" if `sim ≥ 0.70` (char-gram threshold is lower than word-gram because char overlap is denser).
- Union-find over near-dup edges → clusters. (MinHash/SimHash pruning optional for >300 comments; pairwise is fine ≤300.)

**T — Text-duplicate strength.**
- `T(cluster) = min(1.0, cluster_size / 5)` (saturates at 5 distinct-author members). Larger near-dup cluster = stronger.

**B — Burst / temporal-coordination signal.**
- DOM gives only *relative* time ("2분 전", "2 minutes ago"). Parse to coarse minutes (방금/just now/n초→0; n분→n; n시간→n*60; n일→n*1440).
- **Relative time is treated as COARSE ORDERING evidence, not exact timing** (Oracle: 5 comments all "2분 전" cannot resolve a true 10-min window). So B is bucketed conservatively:
  - count distinct authors in the cluster whose comments share the SAME coarse bucket (e.g. all "n분 전" with n≤10): `<3 → B=0`; `3–4 → B=0.6`; `≥5 → B=1.0`.
- **API mode only**: if exact ISO `publishedAt` is available, use a true 10-min sliding window (stronger, precise).

**R — Reply-ring / amplification signal (NEW — replaces handle-randomness).**
- Computed from the comment DOM tree (parentId / thread structure), cheap and coordination-shaped:
  - **R1 cross-thread spread**: the same near-dup text posted by distinct authors as replies under ≥2 DIFFERENT top-level comments.
  - **R2 seed amplification**: ≥3 distinct authors replying near-dup text under ONE seed comment in close order.
- `R = 1.0` if R1 OR R2 with ≥3 distinct authors; `R = 0.5` if exactly 2 distinct authors show the pattern; `R = 0` otherwise.
- Reply-ring is far more coordination-specific than handle entropy (which is noise — YouTube auto-assigns `@user-xy3k9` to real users).

**A — Account-new signal (API mode only).**
- Requires Data API key. Without key, `A = 0` (not used; flag relies on T+B+R).
- `A = 1.0` if ≥2 cluster accounts created ≤30 days ago; `A = 0.5` if ≥3 created 31–180 days ago; else `A = 0`.

**SUPP — Organic-burst suppressor (false-positive guard, NON-NEGOTIABLE, DETERMINISTIC).**
- Input: the cluster's representative normalized text `t` (the shared near-dup text) + cluster member handles.
- `SUPP = true` iff ANY of these EXACT, codeable rules match (no judgment):
  1. **Condolence regex** (case-insensitive, applied to `t`): `/\b(rip|r\.?i\.?p)\b/` OR contains any of the literal substrings `삼가 고인`, `고인의 명복`, `rest in peace`.
  2. **Laughter/reaction floods**: after stripping spaces, `t` matches `/^(ㅋ{3,}|ㅎ{3,}|(lol)+|(haha)+|😂|🤣)+$/u` OR `t` (normalized) is in the literal STOP-CHANT set: `{"goat","legend","first","w","l","real","facts"}`.
  3. **Fandom-chant lexicon**: `t` contains ≥2 tokens (whitespace-split, normalized) from the COMPLETE finite `CHANT_LEXICON` below.
  4. **Emoji density**: (count of Unicode `Extended_Pictographic` codepoints in `t`) / (total codepoints of `t`) ≥ 0.30. (Use the `emoji-regex` npm package or `\p{Extended_Pictographic}` regex for a deterministic count.)
- If `SUPP = true`, the cluster is RE-LABELED "mass repetition (likely organic)", **NOT flagged regardless of S**. Recorded in evidence as the suppressor line (§4.4).
- No fuzzy "looks like a chant" judgment is permitted — only the exact rules above.

**`CHANT_LEXICON` (COMPLETE, inline — this IS the file; the agent commits it verbatim to `src/suppressor/chant-lexicon.ts` as a string array):**
```
사랑해 사랑해요 오빠 오빠들 언니 누나 형 보라해 응원 응원해 응원할게 최애 덕질 직캠 컴백
무대 떼창 화이팅 파이팅 가즈아 떡상 갓 goat legend king queen icon slay
army 아미 blink 블링크 once 원스 carat 캐럿 stay 스테이 moa 모아 nctzen 엔시티즌
방탄 bts 정국 지민 뷔 진 슈가 제이홉 rm 블랙핑크 blackpink 뉴진스 newjeans
사랑 최고 짱 대박 멋져 멋있어 예뻐 귀여워 보고싶어 영원히 평생 항상 늘
rip 명복 고인 삼가 ㅠㅠ ㅜㅜ thank you 감사 고마워 수고 잘봤어요 잘보고
first 1등 선착 ㅋㅋㅋ ㅎㅎㅎ lol haha real facts based w l
```
(93 tokens exactly. The suppressor test asserts: this array is loaded, length ≥ 90, and the fixture M-cluster text matches ≥2 entries — `오빠`, `정국`, `사랑해`, `영원히`, `응원할게`, `보라해`, `아미` are all present above (7 matches, ≥2 satisfied).)

### 4.2 Composite (mode-split)

**No-API mode (default):**
```
S = 0.50*T + 0.30*B + 0.20*R
```
(handle-randomness REMOVED from score — shown in evidence only, never pushes over threshold.)

**API mode (user supplied Data API key):**
```
S = 0.40*T + 0.25*B + 0.20*A + 0.15*R
```

### 4.3 Flag predicate (false-positive guard)

A cluster is **FLAGGED** iff **all FOUR** hold:
1. `S ≥ 0.70`
2. `cluster_size ≥ 3` distinct authors
3. **At least 2 of the mode's signals are strictly positive** (no-API: of {T,B,R}; API: of {T,B,A,R})
4. **`SUPP == false`** (organic-burst suppressor did not fire)

### 4.4 Honest label (NON-NEGOTIABLE)

- The badge text is exactly: **"Matches coordinated-posting patterns in this video"**.
- The score is shown as a percent (`round(S * 100) %`).
- The evidence line is auto-composed from positive signals, e.g. `"8 near-duplicate comments in the same recent window; same text replied across 3 threads."` (composed from T, B, R, and A-if-API; handle-randomness MAY appear as weak context only, e.g. "(note: 4 auto-style handles)", but is NEVER the basis of a flag.)
- If the suppressor fired, the line reads `"N repeated comments — looks like a common reaction/chant, NOT flagged as coordinated."`
- **FORBIDDEN-TERMS canonical list (single source of truth, used by §9 and the test):**
  `bot`, `foreign`, `foreigner`, `Chinese`, `중국`, `Korean`, `한국인`, `Russian`, `러시아`, `agent`, `공작`, `요원`, `manipulator`, `조작범`, `propaganda`, `propagandist`, `간첩`, `spy`.
  (Case-insensitive. This list is the ONE place forbidden terms are defined; §9 references it.)
- `forbidden-words.spec.ts` asserts NONE of these terms appear in user-facing strings across **BOTH** `src/**` (source UI string tables, popup/overlay/badge templates) **AND** `dist/**` (built bundle). Code identifiers/comments that are not user-visible are exempt only if they never reach rendered output; to keep it simple, the test scans all `src/**/*.ts` UI string literals and the entire built bundle text.

---

## 5. Vertical Slices (tracer-bullet, AFK / HITL tagged)

| # | Slice | Tag | Acceptance Predicate | Verification |
|---|---|---|---|---|
| V0 | Repo + toolchain skeleton | AFK | `pnpm i && pnpm build` exits 0; `dist/manifest.json` exists with MV3 keys. | `pnpm build && test -f dist/manifest.json` |
| V1 | Manifest + popup + service worker + content script wired | AFK | Loading `dist/` unpacked yields a toolbar icon; clicking opens popup with a `Scan` button; `chrome.runtime.sendMessage` round-trip works. | unit: harness asserts `content_scripts.matches=["*://*.youtube.com/watch*"]`. |
| V2 | Comment scraper module (pure: HTML → `Comment[]`) | AFK | Given the **committed synthetic fixture** (§5.1), returns the exact expected `Comment[]` (§5.1). | Vitest `scraper.spec.ts` |
| V3 | Normalize + **char-4gram Jaccard** near-dup clusterer | AFK | `cluster(comments,{charGram:4,threshold:0.70,minTokens:5}) → Cluster[]`. Returns expected union-find clusters incl. char-level paraphrase catch. | Vitest `cluster.spec.ts` ≥6 cases incl. emoji/url stripping, short-comment skip, char-gram paraphrase. |
| V4 | Relative-time parser + burst signal (coarse-ordering) | AFK | parses 한국어 + English relative strings; burst() returns expected B per fixture (same-bucket distinct authors). | Vitest `burst.spec.ts` ≥8 cases. |
| V5 | **Reply-ring (R)** + organic-burst **suppressor** + (stub) account-age | AFK | `replyring(cluster, allComments)→R` from parentId tree; `suppressor(cluster)→bool`; `ageSignal→A`. | Vitest `signals.spec.ts` ≥8 cases incl. R1 cross-thread, suppressor chant. |
| V6 | **Mode-split** composite scorer + flag predicate + honest-label | AFK | `score(cluster,{mode}) → {S, flagged, evidence, label}` matching §5.1 v2 oracle (X=0.80 flag, Z=0.68 not, M suppressed). Forbidden-string test passes. | Vitest `score.spec.ts` incl. v2 oracle + forbidden-words regex. |
| V7 | Red-card DOM injector (F1+F6) | HITL-light | flagged clusters get a red badge containing label + percent + evidence. | Vitest on injector via jsdom; visual pre-sealed in MANUAL.md. |
| V8 | Profile card on author click (F2) | HITL-light | Click on flagged author opens overlay with channel link + deep-link buttons; if API key, shows joined/subs/uploads. | Vitest on card-data builder; visual in MANUAL.md. |
| V9 | Block author + MutationObserver re-apply (F3) | AFK | `applyBlocks(dom, blockedIds)` hides matching nodes; re-applies on `yt-navigate-finish` + MutationObserver. | Vitest jsdom fixture; visual in MANUAL.md. |
| V10 | Shareable blocklist export/import (F4) | AFK | Export JSON `{version, channelIds[]}`; import merges + dedupes. | Vitest `blocklist.spec.ts` |
| V11 | Semi-auto report (F5) | AFK | Button copies evidence packet to clipboard + opens YouTube report URL. NOT auto-submit. | Vitest mocks clipboard + `chrome.tabs.create`. |
| V12 | Package + zip + smoke | AFK | `pnpm package` produces `coordcard-<ver>.zip`; unzipped loads in Chrome. | `unzip -l` listing assertion; visual in MANUAL.md. |

### 5.1 Synthetic Fixture Contract (PRE-SEALED — autonomous agent CANNOT browse YouTube)

The agent MUST author `tests/fixtures/comments-snapshot.html` by hand as a **synthetic** file (NOT scraped from YouTube). It must mimic the real YouTube comment DOM shape exactly enough for the scraper, and contain a planted coordinated cluster so the full pipeline is testable offline.

**Required DOM shape per comment** — VERIFIED against real YouTube DOM via playwright headless capture (2026-06; see §5.2). The scraper keys on these element IDs/classes; the fixture MUST mirror the real tag types exactly so "passes on fixture but fails on real YouTube" cannot happen:
```html
<ytd-comment-thread-renderer>
  <!-- author is an <a> tag (NOT div), id=author-text, href is the channel link -->
  <a id="author-text" class="yt-simple-endpoint" href="/@handleString">
    <span>@handleString</span>
  </a>
  <!-- text container id=content-text wraps a yt-attributed-string (real YT) -->
  <yt-attributed-string id="content-text">comment text here</yt-attributed-string>
  <!-- published time is an <a> link, class published-time-text -->
  <a class="published-time-text" href="#">2 minutes ago</a>
  <span id="vote-count-middle">3</span>
</ytd-comment-thread-renderer>
```

**Scraper selector rule (tag-agnostic, robust to YT DOM churn):** select by **ID/class only**, never by tag name. `#author-text` (read `href` attribute), `#content-text` (read `textContent`), `.published-time-text` (read `textContent`), `#vote-count-middle` (read `textContent`). This works whether the element is `<a>`, `<div>`, `yt-attributed-string`, etc. The fixture uses the real-DOM tag types above; the scraper does not depend on them.

**`channelId` derivation rule:** the scraper reads the `href` on `#author-text`. For `/@handle` form, `channelId := "@handle"`. For `/channel/UC...` form, `channelId := "UC..."`. The fixture uses `/@handle` form throughout.

**Comment-id + reply DOM contract:** every `ytd-comment-thread-renderer`/`ytd-comment-view-model` carries a stable `data-cid` attribute (the fixture sets it to the row id below, e.g. `data-cid="C1"`). A reply is a `ytd-comment-view-model` nested inside its parent thread's `<div id="replies">`; the scraper derives `parentId` from the nearest ancestor thread's `data-cid` (null if the node is itself a top-level thread). The scraper records `{id, channelId, text, relTime, parentId}` per comment. The 5 row-id values used as parents below (`C1`, `C8`, `S1`) refer to those exact `data-cid`s.

**Tokenizer (exact, deterministic):** `tokenCount(t)` = number of whitespace-separated tokens of the normalized text. The fixture texts are authored so the counts below are EXACT under whitespace split (verified). minTokens guard uses this.

**The fixture MUST contain EXACTLY these 17 comments (v2 — covers char-dup FLAG, reply-ring sub-threshold, suppressor that WOULD-flag, short-skip, singletons):**

| id (data-cid) | channelId | #content-text | tokens | rel-time | parentId | role in oracle |
|----|-----------|---------------|--------|----------|----------|----------------|
| C1 | `@user8x3k1` | `이 영상 정말 최고예요 꼭 보세요 추천합니다` | 7 | `2 minutes ago` | null | cluster X (top-level dup) |
| C2 | `@k9m2x7q`   | `이 영상 정말 최고예요 꼭 보세요 추천합니다` | 7 | `2 minutes ago` | null | cluster X |
| C3 | `@zz1p4w8`   | `이 영상 정말 최고예요 꼭 보세요 추천합니다` | 7 | `2 minutes ago` | null | cluster X |
| C4 | `@x7q2k9m1`  | `이 영상 정말 최고예요 꼭 보세요 추천합니다` | 7 | `2 minutes ago` | null | cluster X |
| C5 | `@q7w8e9r2`  | `이 영상 정말 최고예요 꼭 보세요 추천합니다` | 7 | `2 minutes ago` | null | cluster X |
| C6 | `@casualguy` | `good video` | 2 | `5 minutes ago` | null | SKIP (<5 tokens) |
| C7 | `@watcher`   | `good video` | 2 | `6 minutes ago` | null | SKIP (<5 tokens) |
| C8 | `@normaluser`| `저는 이 의견에 동의하지 않습니다 근거가 부족해 보이네요` | 8 | `1 day ago` | null | organic singleton → NOT flagged |
| S1 | `@seedpost`  | `오늘 날씨 정말 좋네요 다들 좋은 하루 보내세요` | 8 | `1 hour ago` | null | seed top-level (reply-ring target) |
| T1 | `@dup_a4f9q` | `구독 하고 가세요 정말 유익한 영상 입니다` | 7 | `30 minutes ago` | S1 | reply-ring R (thread S1) |
| T2 | `@dup_b7k2w` | `구독 하고 가세요 정말 유익한 영상 입니다` | 7 | `30 minutes ago` | C1 | reply-ring R (thread C1) |
| T3 | `@dup_c1x8z` | `구독 하고 가세요 정말 유익한 영상 입니다` | 7 | `30 minutes ago` | C8 | reply-ring R (thread C8) |
| M1 | `@bts_fan_kr`| `오빠 정국 사랑해 영원히 응원할게 보라해 아미` | 7 | `4 minutes ago` | null | chant → SUPPRESSED (would-flag) |
| M2 | `@army4ever` | `오빠 정국 사랑해 영원히 응원할게 보라해 아미` | 7 | `4 minutes ago` | null | chant → SUPPRESSED |
| M3 | `@purplelove7`| `오빠 정국 사랑해 영원히 응원할게 보라해 아미` | 7 | `4 minutes ago` | null | chant → SUPPRESSED |
| M4 | `@jk_world`  | `오빠 정국 사랑해 영원히 응원할게 보라해 아미` | 7 | `4 minutes ago` | null | chant → SUPPRESSED |
| M5 | `@borahae_kr`| `오빠 정국 사랑해 영원히 응원할게 보라해 아미` | 7 | `4 minutes ago` | null | chant → SUPPRESSED |

Notes: C1–C5 handles look auto-generated — in v2 EVIDENCE-ONLY, never scored. T1–T3 are replies (parentId set) posting identical text across 3 DIFFERENT threads (S1, C1, C8) = reply-ring R1. M1–M5 = a 5-member identical-chant cluster that WOULD score S≥0.70 (so it proves the suppressor actively blocks a would-be flag), and its text contains ≥2 chant-lexicon tokens (`오빠`, `사랑해`, `응원`, `보라해`, `아미`).

**Expected pipeline output (the BINDING v2 oracle — no-API mode, `S = 0.50·T + 0.30·B + 0.20·R`):**

- `scrapeComments` → 17 `Comment` objects with `parentId` recorded (derived from nearest ancestor thread `data-cid`).
- `cluster({charGram:4, threshold:0.70, minTokens:5})`:
  - **Cluster X** = {C1,C2,C3,C4,C5} (5 distinct top-level authors, identical text).
  - **Cluster Z** = {T1,T2,T3} (3 distinct authors, identical text, each a REPLY under a DIFFERENT parent → reply-ring).
  - **Cluster M** = {M1,M2,M3,M4,M5} (5 distinct authors, identical chant text).
  - C6,C7 dropped (<5 tokens); C8, S1 singletons (no near-dup partner).
- `score()` per cluster:
  - **Cluster X**: T = min(1, 5/5) = **1.0**; B = **1.0** (5 distinct authors, all "2 minutes ago" bucket); R = **0** (all top-level). `S = 0.50·1.0 + 0.30·1.0 + 0.20·0 =` **0.80**. SUPP=false. Flag check: S 0.80≥0.70 ✓, size 5≥3 ✓, positive {T,B}=2≥2 ✓, SUPP false ✓ → **FLAGGED**. Evidence: `"5 near-duplicate comments in the same recent window. (note: auto-style handles)"`.
  - **Cluster Z**: T = min(1, 3/5) = **0.6**; B = **0.6** (3 distinct authors same "30 minutes ago" bucket); R = **1.0** (R1: identical text replied across 3 different threads S1/C1/C8, ≥3 distinct authors). `S = 0.50·0.6 + 0.30·0.6 + 0.20·1.0 = 0.30 + 0.18 + 0.20 =` **0.68**. → **NOT FLAGGED** (0.68 < 0.70). *Intentional: pins that v2 does NOT over-flag a small 3-member ring. The reply pattern is noted in evidence as context, no red card.*
  - **Cluster M (suppressor proof)**: WITHOUT the suppressor it WOULD flag — T=min(1,5/5)=1.0, B=1.0, R=0 → `S = 0.80 ≥ 0.70`, size 5≥3, {T,B}=2 positive. BUT SUPP=**true** (chant-lexicon rule: text contains ≥2 of `오빠/사랑해/응원/보라해/아미`). → **NOT FLAGGED regardless of S**. This is the binding proof that the suppressor actively blocks a would-be 0.80 flag. Evidence: `"5 repeated comments — looks like a common reaction/chant, NOT flagged as coordinated."`
  - **C8, S1**: singletons → not flagged.

This 17-row table + expected output IS the complete offline acceptance oracle for v2 (V2–V7). It exercises: char-dup clustering, the FLAG path (X, S=0.80), reply-ring R computed but sub-threshold (Z, S=0.68), the suppressor ACTIVELY BLOCKING a would-be flag (M, S=0.80→suppressed), short-comment skip (C6/C7), and singletons (C8/S1). No YouTube access required for L1.

### 5.2 Real-DOM Smoke (L2 — playwright headless, VERIFIED FEASIBLE)

Live YouTube comment parsing from an unattended/headless agent WAS verified feasible (playwright chromium headless, 2026-06): navigating a `watch?v=` page, scrolling to lazy-load comments, and querying `ytd-comment-thread-renderer` returned 120+ comment nodes with `#author-text[href=/@handle]`, `#content-text`, and relative time ("6년 전", "21시간 전") all extracted. Therefore the harness MUST add an L2 smoke test in addition to the L1 fixture oracle.

**Two-layer test contract:**
- **L1 (fixture, BLOCKING gate):** Vitest over the §5.1 synthetic v2 fixture (17 comments). DETERMINISTIC — asserts exact scores (cluster X S=0.80 FLAGGED; cluster Z S=0.68 reply-ring sub-threshold NOT flagged; cluster M S=0.80 but SUPPRESSED). This is the algorithm-correctness oracle. Always required.
- **L2 (playwright headless smoke, time-boxed):** Open ONE real YouTube `watch?v=` URL headless, scroll, run the REAL scraper, assert: (a) ≥20 comment nodes parsed, (b) every parsed comment has non-null channelId + text, (c) `cluster()`+`score()` run without throwing. NON-deterministic on values (real comments change) — asserts only "selectors work on real DOM + pipeline doesn't crash". This catches "fixture passes but real YouTube selector drift" — the gap fixtures alone cannot.

**Environment for L2:** playwright + chromium (cache at `~/Library/Caches/ms-playwright`, ~92MB; preinstalled during prep so the run reuses it). If chromium is unavailable at run time, L2 is SKIPPED (logged in SHIP.md) and L1 alone still gates "shipped" — L2 is a confidence booster, not a hard blocker, because the live page is non-deterministic.

---

## 6. Implementation Decisions (modules, no file paths)

- **Stack**: TypeScript, Vite (`@crxjs/vite-plugin` for MV3), Vitest, no React, no UI framework. Plain DOM for badges (Shadow DOM root to isolate styles).
- **Modules** (v2): scraper, normalize, charngram (char-4gram + Jaccard), cluster (union-find), time (relative-time parse), burst, replyring (R from parentId tree), suppressor (organic-burst), age (API-only), score (mode-split composite + flag), inject, blocker, blocklist, report, popup, bg. (handle-randomness is NOT a scoring module — at most a tiny evidence-only helper.)
- **Concurrency budget**: scan of 300 comments must complete in <2 s. Pairwise char-4gram Jaccard is O(n²) but fine ≤300; SimHash/MinHash pruning optional for larger.
- **Permissions**: `storage`, `activeTab`, `scripting`, `clipboardWrite`, host `*://*.youtube.com/*`. No `tabs` global, no `webRequest`.
- **No remote code** (MV3 requirement). All deps bundled.

---

## 7. Testing Decisions

**Unit (Vitest) — MANDATORY, blocks "shipped"**: normalize, charngram, cluster, time, burst, replyring, suppressor, score (mode-split), forbidden-words, blocklist, scraper specs. The score spec MUST assert the §5.1 v2 oracle exactly (cluster X S=0.80 flagged; cluster Z S=0.68 not flagged; cluster M suppressed).

**Manual (pre-sealed in MANUAL.md, executed after the 90-min run)**: load `dist/` unpacked → open pre-listed candidate YouTube URL → click Scan → verify ≥1 red badge OR explicit empty-state banner; badge contains label+percent+evidence; blocking hides comments.

**Two-layer testing (see §5.2):** L1 Vitest over the synthetic fixture is the ONLY hard blocking gate (deterministic). L2 = a time-boxed playwright headless smoke against ONE real YouTube URL, VERIFIED feasible from an unattended agent (120+ comments parsed in a 2026-06 check). L2 asserts only "real-DOM selectors work + pipeline doesn't throw" (non-deterministic on values), and is SKIPPED-with-log if chromium is unavailable — it is a confidence booster, not a blocker. Full Playwright E2E assertions on specific live comments are still out (live page is non-deterministic + auth-gated).

---

## 8. Scope-Cut Policy (pre-sealed, automatic, no human prompt)

| Checkpoint | Action |
|---|---|
| **T+30 min** | If V0–V6 not all green: drop V11 (F5 report) and V10 (F4 blocklist). |
| **T+60 min** | If V7 (red-card UI) not green: drop V9 (F3 block) and V8 (F2 profile card). Focus 100% on V7. |
| **T+75 min** | If V7 still not green: ship the **logic-only demo** — popup shows JSON of detected clusters with evidence, no in-page injection. Mark in `SHIP.md`. |
| **T+85 min** | Freeze. Run `pnpm test && pnpm build && pnpm package`. Then evaluate §10: if ALL §10.A checks (1–8) pass → declare **SHIPPED**. Else if the §10.B soft-shipped fallback criteria pass → declare **SOFT-SHIPPED**. Else → declare **NOT SHIPPED** and write the failing check to `SHIP.md`. ("Green" is never self-defined here — it means the §10 predicate sets exactly.) |

**Demo-path priority (never cut from top)**: V0 → V2 → V3 → V4 → V5 → V6 → V7. Leaves cuttable in reverse: V11 → V10 → V9 → V8.

---

## 9. Explicit Non-Goals

1. Track or infer commenter IP addresses.
2. Aggregate a commenter's comment history across other videos.
3. Auto-submit reports to YouTube or KCSC.
4. Label a commenter with ANY term from the §4.4 FORBIDDEN-TERMS canonical list (bot/foreign/Chinese/Korean/Russian/agent/propagandist/spy/간첩/조작범/공작/… — enforced by `forbidden-words.spec.ts` over src + dist).
5. Score an isolated single comment outside a detected cluster.
6. Train or ship any ML model.
7. Send comment text to any third-party server.
8. Persist any data outside `chrome.storage.local`.
9. Modify or post comments on the user's behalf.

---

## 10. Definition of "Shipped"

Split into **agent-verifiable (the only gate the 90-min run depends on)** and **post-run human demo (NOT a run gate)**.

### 10.A AGENT-VERIFIABLE SHIPPED (T+85, no human, this is THE gate)
The agent self-checks ALL of these via shell — every one is a binary exit code or file assertion:
1. `pnpm test` exits 0 with ≥10 unit-test spec files green.
2. `pnpm build` exits 0 and `dist/manifest.json` exists with `manifest_version: 3`.
3. **Manifest static checks** (jq/grep, no Chrome): `content_scripts.matches` contains `*://*.youtube.com/watch*`; permissions exactly = {storage, activeTab, scripting, clipboardWrite} + host `*://*.youtube.com/*`.
4. **Synthetic-fixture pipeline test (§5.1) green** — scraper→cluster→score produces the exact expected oracle (deterministic L1 proof on offline DOM).
4b. **L2 playwright headless smoke (§5.2) green OR skipped-with-log** — if chromium available: real YouTube URL parsed (≥20 nodes, non-null channelId+text, pipeline runs without throwing); if unavailable: SKIPPED and noted in SHIP.md. L2 result NEVER blocks "shipped" by itself (live page is non-deterministic); it is recorded as a confidence signal.
5. **jsdom injector smoke** (V7): `injectBadges(jsdomRoot, flaggedClusters)` inserts a badge node whose text === honest label + percent + evidence; idempotent on re-run.
6. `forbidden-words.spec.ts` passes against BOTH `src/**` and `dist/**` (see §4.4 unified list).
7. `pnpm package` produces `coordcard-<ver>.zip` containing `manifest.json` (verified via `unzip -l`).
8. `README.md`, `MANUAL.md`, `SHIP.md` exist; README contains §9 non-goals verbatim.

If 1–8 pass → **SHIPPED**. The agent declares done on these alone.

### 10.B POST-RUN HUMAN DEMO (NOT part of the 90-min gate)
After the run, the human (operator) performs the §11 demo path (load unpacked in Chrome, open a MANUAL.md URL, click Scan, see red badges). This is the *showcase*, not a build gate. The agent must NOT block on it and must NOT attempt live-browser automation during the run.

**Soft-shipped (T+75 fallback)**: items 1,2,4,6,7,8 plus a popup that displays detected clusters (from the synthetic fixture or live DOM) as JSON. UI injection (5) deferred.

---

## 11. The Demo Path (POST-RUN human showcase — NOT a 90-min build gate; see §10.B)

```
1. pnpm i && pnpm build
2. chrome://extensions → Developer Mode → Load unpacked → pick dist/
3. Toolbar shows CoordCard icon.
4. Open a URL listed in MANUAL.md.
5. Scroll comments to populate DOM (~100+).
6. Click CoordCard icon → "Scan".
7. Within 2 s, either:
   (a) ≥1 comment gets a red badge "Matches coordinated-posting patterns in this video — NN%" + evidence line, OR
   (b) Popup: "No coordinated clusters found in visible comments."
8. Click red-carded author → profile card with channel link + 3 deep-link buttons.  [skippable §8]
9. Click "Block" → that author's comments disappear.  [skippable]
10. Click "Export blocklist" → JSON downloads.  [skippable]
```

Step 7 is the **non-negotiable demo**.
