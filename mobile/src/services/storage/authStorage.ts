
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clave donde se guarda la sesión de NOTIU.
const KEY = 'notiu_auth';

// Estructura de la sesión que devuelve el backend.
export type AuthSession = {
  token: string;
  expiresAt: string;
  user: {
    id?: number;
    username?: string;
    name?: string;
    firstName?: string;
    email?: string;
    [key: string]: any;
  };
};

// Guarda la sesión recibida del backend.
export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

// Recupera la sesión y comprueba que siga siendo válida.
export async function getSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(KEY);

  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (!session.token || !session.expiresAt || !session.user) {
      await clearSession();
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await clearSession();
      return null;
    }

    return session;
  } catch {
    await clearSession();
    return null;
  }
}

// Obtiene únicamente el token para las peticiones protegidas.
export async function getToken(): Promise<string | null> {
  const session = await getSession();
  return session?.token ?? null;
}

// Obtiene los datos del usuario para mostrarlos en el Home.
export async function getStoredUser(): Promise<{
  username: string;
  email: string;
} | null> {
  const session = await getSession();

  if (!session) return null;

  return {
    username:
      session.user.username ||
      session.user.name ||
      session.user.firstName ||
      'Estudiante',
    email: session.user.email || '',
  };
}

// Elimina la sesión cuando el usuario cierra sesión.
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

const USERS_KEY = 'notiu_registered_users';

// Estructura de las cuentas registradas temporalmente.
export type StoredUser = {
  username: string;
  email: string;
  password: string;
};

// Registra una cuenta local y evita correos duplicados.
export async function registerLocalUser(
  user: StoredUser
): Promise<void> {
  const raw = await AsyncStorage.getItem(USERS_KEY);

  const users: StoredUser[] = raw ? JSON.parse(raw) : [];

  const email = user.email.trim().toLowerCase();

  const alreadyExists = users.some(
    (item) => item.email.toLowerCase() === email
  );

  if (alreadyExists) {
    throw new Error('Ya existe una cuenta registrada con ese correo.');
  }

  users.push({
    ...user,
    username: user.username.trim(),
    email,
  });

  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}
