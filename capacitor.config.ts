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
        iOSClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
        webClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
      },
      apple: {
        clientId: 'com.parparty.pwa',
        redirectUrl: 'https://parparty.app/auth/apple/callback',
      },
    },
  }
};

export default config;
