import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pottypal',
  appName: 'Potty Pal',
  webDir: 'dist',
  plugins: {
    LocalNotifications: { iconColor: '#17806F' },
  },
};

export default config;
