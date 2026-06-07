# CoordCard — Load & Run (load unpacked)

## Load the built extension into Chrome
1. Build (skip if `dist/` already exists): `pnpm i && pnpm build`
2. Open `chrome://extensions` → toggle **Developer mode** (top right)
3. Click **Load unpacked** → select this project's `dist/` folder
4. The **CoordCard** icon appears in the toolbar.
5. Open a YouTube video (`watch?v=...`).
6. Scroll the comments so the DOM populates (~100+ comments).
7. Click the **CoordCard** icon → **Scan comments**. Within ~2 s, either:
   - **(a)** one or more comments in a coordinated cluster get a **red badge** reading
     *"Matches coordinated-posting patterns in this video — NN%"* plus an evidence line, **or**
   - **(b)** the popup shows *"No coordinated clusters found in visible comments."*

Step 7 is the non-negotiable demo. A clean popup preview is in `docs/demo.png`.

## What it does (V2–V7 complete)
- **Scraper** (tag-agnostic, ID/class selectors) → `Comment[]` with `parentId` from the reply tree.
- **Cluster** char-4gram Jaccard ≥ 0.70 (union-find); short comments skipped, singletons excluded.
- **Signals** T (text-dup) · B (coarse-time burst) · R (reply-ring) · A (account-age, API mode).
- **Score** S = 0.50·T + 0.30·B + 0.20·R (no-API), 4-part flag guard, organic-burst suppressor.
- **Inject** red-card badges on flagged-cluster comments (idempotent).
- **Honest label only**; clusters scored, never individuals.

## Troubleshooting — "Could not establish connection / Receiving end does not exist"
This meant the content script wasn't yet loaded in the tab (the tab was open before
the extension loaded, or you reached `/watch` via in-app navigation). **Fixed:** the popup
now injects the content script on demand (`chrome.scripting`) and retries automatically.
After pulling a new build, click **Reload** on the CoordCard card in `chrome://extensions`
once so Chrome picks up the rebuilt `dist/`, then Scan works on any open watch tab.

## Suggested demo URLs
Any politically/commercially active video with a busy comment section works. The detector is
deterministic on the offline §5.1 fixture (the test oracle); live results vary by video.

## Verification commands
- `pnpm test`          → 13 Vitest specs (L1 synthetic-fixture oracle), exit 0
- `pnpm build`         → `dist/manifest.json` (manifest_version 3)
- `pnpm validate:ship` → MV3 + youtube matches + exact permissions
- `pnpm package`       → `coordcard-0.1.0.zip`
