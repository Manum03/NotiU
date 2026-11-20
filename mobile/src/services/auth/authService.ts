// Inicio de sesión, registro y cierre de sesión con Firebase Authentication.
// El backend nunca recibe la contraseña: solo el ID token que entrega Firebase.
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';

import { auth } from '../../config/firebase';
import { apiRequest } from '../api/api';
import { unregisterPushToken } from '../notifications/pushService';
import { getGoogleErrorMessage, loadGoogleSignIn, signOutFromGoogle } from './googleSignIn';

// Usuario que devuelve el backend en GET /auth/me
export type BackendUser = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
};

// Traduce los códigos de error de Firebase a mensajes para el usuario
export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con ese correo.';
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Usa mínimo 8 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo electrónico o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Esta cuenta fue deshabilitada.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.';
    case 'auth/missing-email':
      return 'Escribe tu correo electrónico.';
    case 'auth/account-exists-with-different-credential':
      return 'Ese correo ya tiene una cuenta con contraseña. Inicia sesión con tu correo.';
    default:
      return (
        getGoogleErrorMessage(code) ??
        (error instanceof Error && error.message
          ? error.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.')
      );
  }
}

// Crea la cuenta en Firebase, guarda el nombre y la registra en el backend
export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  // Se fuerza un token nuevo para que incluya el nombre recién guardado.
  // Si el backend no responde, no pasa nada: crea el usuario en su primera petición.
  try {
    const token = await credential.user.getIdToken(true);
    await apiRequest<BackendUser>('/auth/me', { method: 'GET', token });
  } catch (error) {
    console.warn('No se pudo registrar el usuario en el backend todavía:', error);
  }
}

// Inicia sesión y confirma con el backend (que crea el usuario la primera vez)
export async function loginWithEmail(email: string, password: string): Promise<BackendUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  return apiRequest<BackendUser>('/auth/me', { method: 'GET', token });
}

// "Continuar con Google": la credencial de Google se cambia por una sesión de Firebase.
// Devuelve null si el estudiante cerró la ventana de Google sin elegir cuenta.
// Requiere la development build (ver services/auth/googleSignIn.ts).
export async function loginWithGoogle(): Promise<BackendUser | null> {
  const { GoogleSignin, isSuccessResponse } = await loadGoogleSignIn();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const { idToken } = response.data;
  if (!idToken) {
    throw new Error('Google no entregó el idToken. Revisa EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }

  const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  const token = await credential.user.getIdToken();
  return apiRequest<BackendUser>('/auth/me', { method: 'GET', token });
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function logout(): Promise<void> {
  // Primero DELETE /devices (necesita la sesión abierta); si falla igual se cierra la sesión
  await unregisterPushToken().catch((error) =>
    console.warn('No se pudo borrar el token push del dispositivo:', error)
  );
  await signOutFromGoogle();
  await signOut(auth);
}

// ID token actual de Firebase (Firebase lo renueva solo cuando vence)
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
}

// Espera a que Firebase restaure la sesión guardada al abrir la app
export async function getCurrentUser(): Promise<User | null> {
  await auth.authStateReady();
  return auth.currentUser;
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
