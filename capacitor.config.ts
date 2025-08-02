import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parparty.pwa',
  appName: 'ParParty',
  webDir: 'dist',
  plugins: {
    App: {
      launchUrl: 'parparty://'
    },
    SocialLogin: {
      google: {
        iOSClientId: '860809923710-phr8hs4el9t9nmevhjk8oqjad5rd3dv3.apps.googleusercontent.com',
        webClientId: '860809923710-040a8v1e6jj8jvcaa8qicdaebbc362p9.apps.googleusercontent.com',
      },
      apple: {
        clientId: 'com.parparty.pwa',
        redirectUrl: 'https://parparty.app/auth/apple/callback',
      },
    },
  }
};

export default config;
