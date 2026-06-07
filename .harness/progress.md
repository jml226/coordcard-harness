# Progress log

- preflight: node=v22.20.0 pnpm=9.15.9 ts=1780811390
- cycle 2: V0 verified GREEN — pnpm build exit0, dist/manifest.json MV3, validate:ship OK. Prior-run scaffold (crxjs2.4.0/vite6.2.0) confirmed correct. Spurious T+85 freeze was uninitialized start_ts (now set). Next: V2 scraper + fixture.
- cycle 3: V2-V7 logic complete. 13 spec files GREEN (83 pass, 1 L2 skip). Oracle exact: X=0.80 FLAG, Z=0.68 NOT, M=0.80 SUPPRESSED. Fixed 2 bugs: char-gram space-strip (re-spacing) + NFKC compat-jamo in suppressor lexicon/flood.
