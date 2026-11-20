// La sesión la guarda Firebase Authentication (en AsyncStorage, renovando el token solo).
// Aquí NO se guardan contraseñas ni tokens: todo se lee de `auth.currentUser`.
//
// `getSession` se conserva porque muchas pantallas del equipo lo usan para pasar
// `session.token` a apiRequest. En código nuevo no hace falta: apiRequest pone el
// ID token de Firebase automáticamente.
import { auth } from '../../config/firebase';

// Estructura de la sesión que usan las pantallas
export type AuthSession = {
  token: string; // ID token de Firebase (se envía como Bearer al backend)
  expiresAt: string;
  user: {
    id?: string; // UID de Firebase
    username?: string;
    name?: string;
    firstName?: string;
    email?: string;
    [key: string]: any;
  };
};

// Recupera la sesión activa. Si el token venció, Firebase entrega uno nuevo.
export async function getSession(): Promise<AuthSession | null> {
  await auth.authStateReady();
  const user = auth.currentUser;

  if (!user) return null;

  try {
    const result = await user.getIdTokenResult();

    return {
      token: result.token,
      expiresAt: result.expirationTime,
      user: {
        id: user.uid,
        name: user.displayName ?? undefined,
        email: user.email ?? undefined,
      },
    };
  } catch {
    // Sin conexión o sesión revocada
    return null;
  }
}

// Obtiene los datos del usuario para mostrarlos en el Home.
export async function getStoredUser(): Promise<{
  username: string;
  email: string;
} | null> {
  await auth.authStateReady();
  const user = auth.currentUser;

  if (!user) return null;

  return {
    username: user.displayName || user.email?.split('@')[0] || 'Estudiante',
    email: user.email || '',
  };
}

// Cierra la sesión de Firebase.
export async function clearSession(): Promise<void> {
  await auth.signOut();
}
