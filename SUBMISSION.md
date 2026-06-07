# CoordCard — Ralphthon Submission

**CoordCard** — a YouTube coordinated-comment cluster detector, MV3 Chrome extension, built
by a 90-minute hands-off autonomous run.

## 1. GitHub URL
**https://github.com/jml226/coordcard-harness** (decided: overwrite the existing repo).

**Status: PENDING push** — `gh` is not authenticated in this unattended run, so the
force-push could not run automatically. The `origin` remote and `main` branch are already
configured; the operator runs ONE line to publish (local commits contain the finished work):

```bash
gh auth login && git -C ~/Desktop/ralphton2 push -f origin main
```

## 2. Demo
- `docs/demo.png` — popup screenshot (Chrome headless render of the built UI).
- `docs/overview.html` — self-contained project + harness overview (dark theme, real build numbers).

## 3. README
- `README.md` — one-pager: what / why (cited facts) / how to use / algorithm / honesty / non-goals verbatim / build commands.

## 4. Load & demo path
- `MANUAL.md` — `chrome://extensions` → Developer mode → Load unpacked → `dist/` → Scan.

## 5. Build / ship status (§10.A gate)
All eight shell-verifiable checks pass — **SHIPPED**:

1. ✅ `pnpm test` exit 0 — **13 spec files**, 84 assertions green (1 skipped: browser-import L2 variant).
2. ✅ `pnpm build` exit 0 — `dist/manifest.json` is MV3.
3. ✅ Manifest static checks — `*://*.youtube.com/watch*` match + exact `{storage, activeTab, scripting, clipboardWrite}` + host permission.
4. ✅ L1 synthetic-fixture pipeline — X=0.80 FLAGGED, Z=0.68 NOT, M=0.80 SUPPRESSED (exact oracle).
4b. L2 real-YouTube headless smoke — see `SHIP.md` for the attempt outcome (non-blocking).
5. ✅ jsdom injector smoke — badge text = honest label + percent + evidence, idempotent.
6. ✅ `forbidden-words.spec` — clean over `src/**` and `dist/**`.
7. ✅ `pnpm package` — `coordcard-0.1.0.zip` contains `manifest.json`.
8. ✅ `README.md`, `MANUAL.md`, `SHIP.md` exist; README has §9 non-goals verbatim.

See `SHIP.md` for the live gate checklist and `.harness/` for the run blackboard.
