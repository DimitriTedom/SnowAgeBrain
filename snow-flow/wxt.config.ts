import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Snow Flow',
    description: 'Bulk asset generator and downloader for Google Flow',
    version: '1.0.0',
    permissions: ['storage', 'downloads', 'activeTab', 'sidePanel', 'scripting', 'debugger'],
    host_permissions: ['https://labs.google/*', 'https://*.google.com/*', 'https://flow.google/*', 'https://*.flow.google/*'],
    action: {},
    side_panel: {
      default_path: 'sidepanel.html'
    }
  },
});
