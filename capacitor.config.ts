import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ecotrade.app',
  appName: 'EcoTrade',
  webDir: '.output/public',
  server: {
    url: 'https://eco-tradeapp-43u8.vercel.app',
    cleartext: true
  }
};

export default config;
