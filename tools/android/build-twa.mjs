/**
 * Genera la app Android (TWA) de TrenAvís con Bubblewrap y la compila y firma: APK (instalar directamente) y AAB (Google Play).
 * Requiere: JDK 17, Android SDK (ANDROID_HOME), @bubblewrap/core, android.keystore y KS_PASS (tools/android/keystore.sh).
 * Uso: node tools/android/build-twa.mjs <versionCode>
 */
import { TwaManifest, TwaGenerator, ConsoleLog, Config, JdkHelper, AndroidSdkTools, GradleWrapper, JarSigner } from '@bubblewrap/core';
import { mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ORIGIN = 'https://trenavis.lorennsw.workers.dev';
const PACKAGE = 'io.github.lorennsw.trenavis';
const code = Number(process.argv[2] ?? 1);
const dir = resolve('android-build');
const out = resolve('android-out');
const keystore = resolve('android.keystore');
const pass = process.env.KS_PASS;
if (!pass || !existsSync(keystore)) throw new Error('Falta la clave de firma (ejecuta tools/android/keystore.sh)');
const log = new ConsoleLog('trenavis');

const base = await TwaManifest.fromWebManifest(`${ORIGIN}/manifest.webmanifest`);
// Los colores de TwaManifest son objetos: se configuran en formato JSON (texto) y se vuelve a construir
const m = new TwaManifest({
  ...base.toJson(),
  packageId: PACKAGE, host: new URL(ORIGIN).host, name: 'TrenAvís', launcherName: 'TrenAvís',
  startUrl: '/', appVersionCode: code, appVersionName: `1.0.${code}`,
  enableNotifications: true,             // notificaciones web delegadas en la app (canal de Android)
  fallbackType: 'customtabs', orientation: 'portrait', display: 'standalone',
  signingKey: { path: keystore, alias: 'trenavis' },
  generatorApp: 'trenavis-ci',
  minSdkVersion: 24,                     // Android 7.0+ (lo exige androidbrowserhelper)
  themeColor: '#1240e0',                 // barra de estado
  backgroundColor: '#1240e0',            // pantalla de inicio (con el icono blanco), igual que la de la web
  splashScreenFadeOutDuration: 300,
  navigationColor: '#ffffff', navigationColorDark: '#0a0d18',             // barra inferior del sistema
  navigationDividerColor: '#d5dbef', navigationDividerColorDark: '#262e4a',
});
await new TwaGenerator().createTwaProject(dir, m, log);
// Pantalla de inicio: icono blanco (el normal es azul y se perdería sobre el fondo cobalto)
for (const d of readdirSync(join(dir, 'app/src/main/res')).filter((x) => x.startsWith('drawable-'))) {
  const f = join(dir, 'app/src/main/res', d, 'splash.png');
  if (existsSync(f)) copyFileSync(resolve('tools/android/splash.png'), f);
}

const config = new Config(process.env.JAVA_HOME, process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT);
const jdk = new JdkHelper(process, config);
const sdk = await AndroidSdkTools.create(process, config, jdk, log);
const gradle = new GradleWrapper(process, sdk, dir);
mkdirSync(out, { recursive: true });

await gradle.assembleRelease();
const unsigned = join(dir, 'app/build/outputs/apk/release/app-release-unsigned.apk');
const aligned = join(dir, 'app-release-aligned.apk');
await sdk.zipalign(unsigned, aligned);
await sdk.apksigner(keystore, pass, 'trenavis', pass, aligned, join(out, `trenavis-${code}.apk`));

await gradle.bundleRelease();
await new JarSigner(jdk).sign({ path: keystore, alias: 'trenavis' }, pass, pass, join(dir, 'app/build/outputs/bundle/release/app-release.aab'), join(out, `trenavis-${code}.aab`));
console.log(`OK: android-out/trenavis-${code}.apk y .aab`);
