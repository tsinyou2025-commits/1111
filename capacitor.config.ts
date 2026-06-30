import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.longnight.stories',
  appName: '长夜故事',
  webDir: 'dist',
  server: {
    url: 'https://1111-two-iota.vercel.app',
    cleartext: false,
  },
};

export default config;
