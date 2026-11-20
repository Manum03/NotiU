// Acceso a Google Sign-In (@react-native-google-signin/google-signin).
//
// El módulo es nativo: NO existe en Expo Go y si se importa allí la app se cierra.
// Por eso se carga con import() solo cuando se necesita y antes se revisa si la app
// corre en Expo Go. Para usarlo hay que instalar la development build (ver README).
import { isRunningInExpoGo } from 'expo';

// ID de cliente OAuth de tipo "Aplicación web" (mobile/.env)
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

// Permisos de solo lectura que el backend usa para leer las tareas de Classroom
export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
];

export const googleSignInAvailable = (): boolean => !isRunningInExpoGo();

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

// Carga el módulo y lo configura. `classroom: true` pide además los permisos de
// Classroom y un serverAuthCode (offlineAccess) para que el backend obtenga el refresh token.
// `forceCode` (solo Android) obliga a Google a entregar un código nuevo.
export async function loadGoogleSignIn(
  { classroom = false, forceCode = false }: { classroom?: boolean; forceCode?: boolean } = {}
): Promise<GoogleSignInModule> {
  if (!googleSignInAvailable()) {
    throw new Error(
      'Esta opción necesita la versión de desarrollo de NotiU (development build). No funciona en Expo Go.'
    );
  }
  if (!WEB_CLIENT_ID) {
    throw new Error(
      'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en mobile/.env. Pídelo al equipo y reinicia Expo.'
    );
  }

  const google = await import('@react-native-google-signin/google-signin');
  google.GoogleSignin.configure(
    classroom
      ? {
          webClientId: WEB_CLIENT_ID,
          offlineAccess: true,
          scopes: CLASSROOM_SCOPES,
          forceCodeForRefreshToken: forceCode,
        }
      : { webClientId: WEB_CLIENT_ID }
  );
  return google;
}

// Mensaje en español para los errores del módulo de Google (o null si no es de Google)
export function getGoogleErrorMessage(code: string): string | null {
  switch (code) {
    case 'IN_PROGRESS':
      return 'Ya hay un inicio de sesión con Google en curso.';
    case 'PLAY_SERVICES_NOT_AVAILABLE':
      return 'Necesitas Google Play Services actualizado para continuar con Google.';
    case 'DEVELOPER_ERROR':
    case '10':
      return 'Google Sign-In no está bien configurado (revisa el webClientId y la huella SHA-1 en Firebase).';
    default:
      return null;
  }
}

// Cierra la sesión de Google en el dispositivo (si el módulo está disponible)
export async function signOutFromGoogle(): Promise<void> {
  if (!googleSignInAvailable() || !WEB_CLIENT_ID) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
  } catch {
    // Si falla no impide cerrar la sesión de NotiU
  }
}
