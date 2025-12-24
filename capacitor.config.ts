import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.dipontwordmaster',
  appName: 'dipontwordmaster',
  webDir: 'dist',
  server: {
    url: 'https://059824a4-9d09-42a8-8d91-2b5a77b1007e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
