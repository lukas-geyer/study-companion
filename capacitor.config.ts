// Capacitor wraps the built web app (dist/) as the iOS app. Bundle ID and name as registered with Apple.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'at.semestra.app',
  appName: 'Semestra',
  webDir: 'dist',
  ios: {
    // The page handles the notch and home bar itself (viewport-fit=cover + safe-area padding).
    contentInset: 'never',
    backgroundColor: '#f7f6fb',
  },
};

export default config;
