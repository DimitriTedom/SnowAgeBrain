import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'Snow Flow',
    description: 'Bulk asset generator and downloader for Google Flow',
    version: '1.0.0',
    permissions: ['storage', 'downloads', 'activeTab', 'sidePanel', 'scripting'],
    host_permissions: ['https://labs.google/*', 'https://*.google.com/*'],
    action: {},
    side_panel: {
      default_path: 'sidepanel.html'
    }
  },
});
