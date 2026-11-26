import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { environment } from '../environments/environment';

const app = initializeApp(environment.firebase);

// V nativní aplikaci (Android, iOS) nastavujeme úložiště přihlášení ručně.
// Výchozí getAuth() v nativním WebView může čekat donekonečna a appka by zůstala na „Ověřuji přihlášení…“.
export const firebaseAuth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);

// Offline režim: Firestore ukládá načtená data do IndexedDB v zařízení.
// Bez připojení appka zobrazí poslední známá data a změny odešle po obnovení připojení.
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
