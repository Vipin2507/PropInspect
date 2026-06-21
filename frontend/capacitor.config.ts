import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.propinspect.app',
  appName: 'PropInspect',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,  // allow HTTP to VPS IP (self-signed cert workaround)
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Keep disabled — CapacitorHttp intercepts axios and can drop POST bodies on Android.
    // CORS allows https://localhost (Capacitor WebView origin).
    CapacitorHttp: {
      enabled: false,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1A6FE8',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
