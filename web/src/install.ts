/**
 * Instalación como app: Chrome/Edge en Android (y escritorio) lanzan `beforeinstallprompt`; lo guardamos para mostrar
 * un botón "Instalar" de un toque. Chrome genera por dentro un APK (WebAPK) que aparece en el cajón de apps.
 * En iPhone no existe: se muestra la guía de Safari.
 */
import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from './push';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

if (typeof window !== 'undefined') {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; notify(); });
  addEventListener('appinstalled', () => { deferred = null; installedNow = true; notify(); });
}
let installedNow = false;

export type InstallState = 'installed' | 'available' | 'ios' | 'manual';

export function useInstall(): { state: InstallState; install: () => Promise<boolean> } {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const state: InstallState = installedNow || isStandalone() ? 'installed' : deferred ? 'available' : isIOS() ? 'ios' : 'manual';
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null; notify();
    return outcome === 'accepted';
  };
  return { state, install };
}
