import type { CapacitorConfig } from '@capacitor/cli';

/** App Android independiente: la web compilada (dist/) va dentro de la app; los datos vienen de la API. */
const config: CapacitorConfig = {
  appId: 'io.github.lorennsw.trenavis',
  appName: 'TrenAvís',
  webDir: 'dist',
  android: { backgroundColor: '#1240e0' },
  plugins: {
    // Android 15+ dibuja la app bajo la barra de estado y la de gestos: Capacitor pasa sus medidas a la web
    // (env(safe-area-inset-*) y --safe-area-inset-*), y la web deja el hueco.
    SystemBars: { insetsHandling: 'css' },
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
