import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Lurix: Codeforces IDE & Auto-Runner',
  description: 'Practice Without Friction',
  version: pkg.version,
  icons: {
    16: 'Lurix-Logo.png',
    48: 'Lurix-Logo.png',
    128: 'Lurix-Logo.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'Lurix-Logo.png',
      48: 'Lurix-Logo.png',
      128: 'Lurix-Logo.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://codeforces.com/*', 'https://*.codeforces.com/*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_end',
    },
  ],
  permissions: ['storage', 'unlimitedStorage'],
  host_permissions: ['https://codeforces.com/*', 'https://*.codeforces.com/*', 'https://wandbox.org/*'],
  web_accessible_resources: [
    {
      resources: ['Lurix-Logo.png', 'public/*', 'monaco/**/*', 'assets/*'],
      matches: ['https://codeforces.com/*', 'https://*.codeforces.com/*'],
    },
  ],
})
