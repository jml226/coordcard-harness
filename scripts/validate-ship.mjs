import { readFileSync, existsSync } from 'node:fs'
const die = (m) => { console.error('VALIDATE:SHIP FAIL —', m); process.exit(1) }
if (!existsSync('dist/manifest.json')) die('dist/manifest.json missing (run pnpm build)')
let m
try { m = JSON.parse(readFileSync('dist/manifest.json', 'utf8')) } catch { die('dist/manifest.json not valid JSON') }
if (m.manifest_version !== 3) die(`manifest_version is ${m.manifest_version}, expected 3`)
const matches = m.content_scripts?.[0]?.matches ?? []
if (!matches.includes('*://*.youtube.com/watch*')) die('content_scripts matches missing youtube watch')
const perms = [...(m.permissions ?? [])].sort().join(',')
if (perms !== 'activeTab,clipboardWrite,scripting,storage') die(`permissions wrong: ${perms}`)
console.log('VALIDATE:SHIP OK — dist/manifest.json is MV3 + correct matches/permissions')
