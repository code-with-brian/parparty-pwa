import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parparty.pwa',
  appName: 'ParParty',
  webDir: 'dist',
  plugins: {
    App: {
      launchUrl: 'parparty://'
    }
  }
};

export default config;
