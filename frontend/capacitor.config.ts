import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.propinspect.app',
  appName: 'PropInspect',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true, // required since backend is HTTP not HTTPS
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // production build
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1A6FE8',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1A6FE8',
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
