import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';

// Configuración de la app web registrada en Firebase
// (Consola de Firebase > Configuración del proyecto > Tus apps > App web).
// Los valores se leen de mobile/.env (ver .env.example). No son secretos,
// pero se dejan fuera de git para que cada quien use su proyecto.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn(
    '[firebase] Falta EXPO_PUBLIC_FIREBASE_API_KEY. Copia mobile/.env.example como mobile/.env y llénalo.'
  );
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// En React Native, Metro carga la versión "react-native" de Firebase Auth, que sí
// incluye getReactNativePersistence; los tipos de 'firebase/auth' no la declaran.
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

// La sesión se guarda en AsyncStorage: el usuario sigue logueado al cerrar la app
const createAuth = (): Auth => {
  try {
    return firebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Con recarga en caliente (Fast Refresh) Auth ya puede estar inicializado
    return firebaseAuth.getAuth(app);
  }
};

export const auth = createAuth();

// Emulador local de Auth (opcional): EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR=http://192.168.x.x:9099
if (process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR) {
  firebaseAuth.connectAuthEmulator(auth, process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR, {
    disableWarnings: true,
  });
}
