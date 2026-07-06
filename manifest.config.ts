import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Lurix',
  description: 'Practice Without Friction',
  version: pkg.version,
  icons: {
    16: 'public/Lurix-Logo.png',
    48: 'public/Lurix-Logo.png',
    128: 'public/Lurix-Logo.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'public/Lurix-Logo.png',
      48: 'public/Lurix-Logo.png',
      128: 'public/Lurix-Logo.png',
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
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'unlimitedStorage'],
  host_permissions: ['https://codeforces.com/*', 'https://*.codeforces.com/*', 'https://wandbox.org/*'],
  web_accessible_resources: [
    {
      resources: ['public/*', 'monaco/**/*'],
      matches: ['https://codeforces.com/*', 'https://*.codeforces.com/*'],
    },
  ],
})
