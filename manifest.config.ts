import { defineManifest } from '@crxjs/vite-plugin'
export default defineManifest({
  manifest_version: 3,
  name: 'CoordCard',
  version: '0.1.0',
  description: 'Detect coordinated YouTube comment clusters and red-card them with evidence.',
  action: { default_popup: 'src/popup/index.html', default_title: 'CoordCard' },
  permissions: ['storage', 'activeTab', 'scripting', 'clipboardWrite'],
  host_permissions: ['*://*.youtube.com/*'],
  content_scripts: [{ matches: ['*://*.youtube.com/watch*'], js: ['src/content/main.ts'] }],
})
