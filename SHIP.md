# SHIP report

Status: SHIPPED
Decision (T+85 gate): **SHIPPED** — all §10.A items 1–8 pass (binary shell checks); 4b L2 attempted + recorded (non-blocking).

## §10.A gate (1-8)
- [x] 1. `pnpm test` exits 0 — **15 spec files**, 93 assertions green (2 skipped = browser-only L2 variants).
- [x] 2. `pnpm build` exits 0 and `dist/manifest.json` has `manifest_version: 3`.
- [x] 3. manifest static checks — `*://*.youtube.com/watch*` match + exact permissions `{storage, activeTab, scripting, clipboardWrite}` + host `*://*.youtube.com/*`.
- [x] 4. synthetic-fixture pipeline (L1) green — **X S=0.80 FLAGGED · Z S=0.68 NOT · M S=0.80 SUPPRESSED** (exact oracle, `pipeline.spec.ts`).
- [x] 4b. L2 real-YouTube smoke — **attempted + recorded** (non-blocking). See L2 section below.
- [x] 5. jsdom injector smoke — badge text === honest label + percent + evidence; idempotent. Covered for BOTH the data-cid fixture (`inject.spec.ts`) AND live-form DOM with no data-cid (`inject-live.spec.ts`, WAVE D fix).
- [x] 6. `forbidden-words.spec.ts` green over `src/**` (UI string literals) AND `dist/**` (whole bundle).
- [x] 7. `pnpm package` produces `coordcard-0.1.0.zip` containing `manifest.json` (verified via `unzip -l`).
- [x] 8. `README.md`, `MANUAL.md`, `SHIP.md` exist; README contains the §9 non-goals verbatim.

## Notes
- Continuation run (waves A–E) after the initial T+37 ship: published-URL set, working-demo screenshot, overview depth, build hardening, final re-gate.
- **WAVE D critical V7 fix:** the injector previously resolved comment nodes by `[data-cid="<id>"]`, so on live YouTube (ids `live-N`, no `data-cid`) detection fired but ZERO badges rendered. Now inject resolves nodes via the scraper's own id→node map (`scrapeEntries`), proven by `inject-live.spec.ts` (RED→GREEN). Real working demo in `docs/demo.png` (5 red badges + label + 80% + evidence; chant suppressed, dissent clean).
- Spine V0→V7 complete: scraper → char-4gram cluster → time/burst → reply-ring + suppressor → mode-split score + flag → red-card injector. All as pure, unit-tested modules.
- Honesty rule enforced: single label "Matches coordinated-posting patterns in this video"; clusters scored, never individuals; §4.4 forbidden terms banned over src + dist (canonical list isolated in `src/forbidden-terms.ts`, the only excluded file).
- Spurious early "T+85 freeze" / "test red" hooks at session start were from an uninitialized `start_ts` (no clock yet); bootstrap set the 90-min clock and they resolved.
- T+30 scope cut honored: V11 (report) not built, V10 (blocklist) left as-is (already complete + green), not expanded.

## L2 real-YouTube readiness & outcome
- ready: true (chromium cache `chromium-1223` present)
- **Attempted** against `https://www.youtube.com/watch?v=dQw4w9WgXcQ` via cached "Google Chrome for Testing" (playwright-core).
- **Key finding (the value of L2):** live YouTube renders **140–160 `ytd-comment-thread-renderer` nodes but 0 with `data-cid`**. The §5.1 fixture assumed `data-cid`; production does not expose it on comment renderers. The original `[data-cid]`-only scraper parsed 0 live comments — the exact "fixture passes but live drifts" gap L2 exists to catch.
- **Fix applied:** added a live-DOM fallback to the scraper keyed on `ytd-comment-view-model` (with `#published-time-text` for time), triggered ONLY when no `[data-cid]` is present — so the L1 fixture oracle is byte-identical (13 specs still green).
- **Deterministic proof (in the test suite):** `l2-smoke.spec.ts` parses a captured 160-thread real-DOM snapshot and asserts **≥20 comments with non-null channelId+text** and that `cluster()+score()` run without throwing. Passes.
- Live browser re-runs are non-deterministic (140 / 160 / 0 renderers across runs depending on lazy-load/consent timing) — exactly why §5.2 marks L2 non-blocking. The deterministic snapshot assertion is the durable evidence; L1 alone gates "shipped".
