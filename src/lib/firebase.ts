import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";

// Public web config of the Firebase project "apptreino" (safe to ship: data access is enforced by Firestore rules).
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD944jrfTQDIGiAH6uskT3o8rJgpxYbGsA",
  authDomain: "apptreino-f3677.firebaseapp.com",
  projectId: "apptreino-f3677",
  storageBucket: "apptreino-f3677.firebasestorage.app",
  messagingSenderId: "825704581793",
  appId: "1:825704581793:web:0fc8921ff11aa3ce4b7ee0",
};

/** The app's administrator: can invite people. Must match `firestore.rules`. */
export const ADMIN_EMAIL = "andersoonfalcao@gmail.com";

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
}

let authInstance: Auth | null = null;
export function auth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(firebaseApp());
    authInstance.languageCode = "pt-BR"; // password-reset and verification e-mails in Portuguese
  }
  return authInstance;
}

let dbInstance: Firestore | null = null;
/** Firestore with an on-device cache, so the app keeps working offline at the gym and syncs later. */
export function db(): Firestore {
  dbInstance ??= initializeFirestore(firebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  return dbInstance;
}
