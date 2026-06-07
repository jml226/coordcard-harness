# CoordCard

**Detect coordinated YouTube comment clusters and red-card them with evidence — never an individual.**

CoordCard is a Chrome **MV3** extension. One toolbar click scans the visible comment
section of the current YouTube video, detects **coordinated near-duplicate clusters**, and
red-cards each flagged cluster inline with concrete evidence. Comments *outside* a detected
cluster are never scored.

![demo](docs/demo.png)

## Why

Coordinated inauthentic commenting on YouTube is a documented, large-scale problem — but
existing tooling is per-comment and gives the viewer zero evidence:

- **Google TAG (Q1 2026)** terminated **2,254 + 2,602 + 1,096** PRC-linked YouTube channels
  in a *single quarter*. Of the DRAGONBRIDGE/Spamouflage network, **80% had 0 subscribers**
  and comment loops occurred **among their own accounts**. *(blog.google security bulletin Q1 2026)*
- **Korea academic study (2024):** 239 suspected coordinated YouTube accounts identified;
  one article drew **2,698 comments**, and a single account posted **130 comments/day**.
  *(yna.co.kr)*

These facts justify the *problem*. They do **not** justify labeling any individual — see Honesty below.

## How to use

```
1. pnpm i && pnpm build
2. chrome://extensions → enable Developer Mode → "Load unpacked" → pick the dist/ folder
3. The CoordCard icon appears in the toolbar.
4. Open a YouTube watch page, scroll to load comments.
5. Click the CoordCard icon → "Scan comments".
6. Flagged clusters get a red badge: the honest label + score% + evidence line.
   If nothing coordinated is found, the popup says so.
```

## Algorithm (one line)

char-4gram **Jaccard ≥ 0.70** near-dup clustering (union-find) → composite
**S = 0.50·T + 0.30·B + 0.20·R** (no-API mode), a **4-part flag guard**
(S ≥ 0.70, ≥3 distinct authors, ≥2 positive signals, suppressor off), and a deterministic
**organic-burst suppressor** that protects fan chants / RIP storms / emoji floods.

- **T** text-duplicate strength · **B** coarse-time burst · **R** reply-ring amplification
  (computed from the parentId tree) · **A** account-age (API mode only).
- Mode-split: API mode uses `S = 0.40·T + 0.25·B + 0.20·A + 0.15·R`.

## Honesty (binding)

- The **only** label is **"Matches coordinated-posting patterns in this video"**.
- A single comment outside a detected cluster is **never** scored.
- A forbidden-terms list (slurs / nationality / accusatory labels) is enforced by
  `forbidden-words.spec.ts` over **both** `src/**` and the built `dist/**` bundle.

## Non-Goals (verbatim)

1. Track or infer commenter IP addresses.
2. Aggregate a commenter's comment history across other videos.
3. Auto-submit reports to YouTube or KCSC.
4. Label a commenter with ANY term from the §4.4 FORBIDDEN-TERMS canonical list (bot/foreign/Chinese/Korean/Russian/agent/propagandist/spy/간첩/조작범/공작/… — enforced by `forbidden-words.spec.ts` over src + dist).
5. Score an isolated single comment outside a detected cluster.
6. Train or ship any ML model.
7. Send comment text to any third-party server.
8. Persist any data outside `chrome.storage.local`.
9. Modify or post comments on the user's behalf.

## Build & test

```
pnpm i
pnpm build           # → dist/manifest.json (MV3)
pnpm test            # 13 Vitest specs (L1 synthetic-fixture oracle)
pnpm validate:ship   # MV3 + youtube matches + exact permissions
pnpm package         # → coordcard-0.1.0.zip
```

## Stack

TypeScript · Vite (`@crxjs/vite-plugin`) · Vitest · jsdom · no UI framework. See
`coordcard-PRD.md` for the full binding spec and `docs/overview.html` for the project +
harness overview.
