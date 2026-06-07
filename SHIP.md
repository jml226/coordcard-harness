# SHIP report

Status: IN PROGRESS
Decision (filled at T+85): SHIPPED | SOFT-SHIPPED | NOT SHIPPED

## §10.A gate (1-8)
- [ ] 1. pnpm test exits 0 with >=10 spec files green
- [ ] 2. pnpm build exits 0 and dist/manifest.json has manifest_version 3
- [ ] 3. manifest static checks (matches + permissions)
- [ ] 4. synthetic-fixture pipeline (L1) green
- [ ] 4b. L2 playwright smoke green OR skipped-with-log
- [ ] 5. jsdom injector smoke green
- [ ] 6. forbidden-words.spec green over src + dist
- [ ] 7. pnpm package produces coordcard-<ver>.zip
- [ ] 8. README.md, MANUAL.md, SHIP.md exist

## Notes

## L2 real-YouTube readiness
- ready: true
- reason: chromium cache present
- when ready, the run MUST attempt the L2 headless smoke against one real watch?v= URL and record parsed-comment count here + in results.jsonl.
