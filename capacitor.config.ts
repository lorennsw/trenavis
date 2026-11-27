import type { CapacitorConfig } from '@capacitor/cli';

/** App Android independiente: la web compilada (dist/) va dentro de la app; los datos vienen de la API. */
const config: CapacitorConfig = {
  appId: 'io.github.lorennsw.trenavis',
  appName: 'TrenAvís',
  webDir: 'dist',
  android: { backgroundColor: '#1240e0' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600, launchAutoHide: false,   // la oculta la app cuando cargan los horarios
      backgroundColor: '#1240e0', androidScaleType: 'CENTER_INSIDE', showSpinner: false,
      splashFullScreen: false, splashImmersive: false,
    },
    PushNotifications: { presentationOptions: ['alert', 'sound'] },
    StatusBar: { backgroundColor: '#1240e0', style: 'DARK', overlaysWebView: false },
  },
};
export default config;
