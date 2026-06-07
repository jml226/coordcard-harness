# Progress log

- preflight: node=v22.20.0 pnpm=9.15.9 ts=1780811390
- cycle 2: V0 verified GREEN — pnpm build exit0, dist/manifest.json MV3, validate:ship OK. Prior-run scaffold (crxjs2.4.0/vite6.2.0) confirmed correct. Spurious T+85 freeze was uninitialized start_ts (now set). Next: V2 scraper + fixture.
- cycle 3: V2-V7 logic complete. 13 spec files GREEN (83 pass, 1 L2 skip). Oracle exact: X=0.80 FLAG, Z=0.68 NOT, M=0.80 SUPPRESSED. Fixed 2 bugs: char-gram space-strip (re-spacing) + NFKC compat-jamo in suppressor lexicon/flood.
- cycle 4: submission artifacts created (README, docs/demo.png 20K, docs/overview.html, MANUAL updated, SUBMISSION.md). AVOIDED disaster: git root was $HOME; created nested repo in ralphton2, committed 57 scoped files (no node_modules/dist). GH not authed -> URL PENDING. Next: attempt L2.
- cycle 5: L2 surfaced real gap (live YT exposes NO data-cid; 140-160 renderers). Added live-DOM fallback selector (ytd-comment-view-model) — triggers only when data-cid absent, so L1 oracle byte-identical (13 specs still green). Deterministic snapshot test parses >=20 real comments. Live browser runs non-deterministic (140/160/0 renderers across runs). Full gate: 84 pass +1 skip, build/validate/package=0.
- cycle 6: §10.A GATE ALL PASS at 2130s. Wrote .harness/DONE (SHIPPED).
- WAVE D: FIXED critical V7 bug — injectBadges looked up nodes by [data-cid] so LIVE comments (live-N ids, no data-cid) got 0 badges despite flagged detection. Refactored scraper.scrapeEntries (id+node), inject resolves via same id scheme. Test-first (RED->GREEN): tests/inject-live.spec.ts. Now 14 specs / 87 pass.
- WAVE A: submission URL set to github.com/jml226/coordcard-harness; origin+main configured; push PENDING (gh not authed) -> 1-line operator cmd in SUBMISSION.md. WAVE C: overview.html expanded with 4 caught-bugs table + updated stats (15 specs/93). WAVE D edge: empty/all-short/paraphrase/mixed/300-perf/empty-scrape specs added. 15 specs / 93 pass.
