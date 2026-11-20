// Notificaciones push con Expo (expo-notifications, SDK 58).
//
// - Registra el dispositivo en el backend (POST /devices) con el Expo push token.
// - Crea el canal Android "default" (el backend envía con channelId: "default").
// - Muestra las alertas también con la app abierta.
// - Al tocar una notificación abre la tarea (data.taskId) o la lista de notificaciones.
//
// Las push NO funcionan en Expo Go en Android: hace falta la development build (README).
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { navigationRef } from '../../navigation/navigationRef';
import { apiRequest } from '../api/api';

// Último token registrado en el backend (para borrarlo con DELETE /devices al cerrar sesión)
const PUSH_TOKEN_KEY = 'notiu.pushToken';

// Datos que el backend agrega a cada push
export type PushData = {
  notificationId?: string;
  taskId?: string | null;
  kind?: string;
};

// Mostrar banner, sonido y contador aunque la app esté abierta.
// En SDK 58 se usan shouldShowBanner/shouldShowList (shouldShowAlert está obsoleto).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Canal Android "default". Debe existir ANTES de pedir el permiso en Android 13+.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Tareas y recordatorios',
    description: 'Tareas nuevas, cambios de fecha y recordatorios de entrega',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#AA0330',
  });
}

// ID del proyecto de EAS (lo agrega `npx eas-cli@latest init` en app.json)
const getProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: string };

// Pide permiso (solo la primera vez muestra el diálogo del sistema), obtiene el token
// y lo registra en el backend. Se llama cada vez que hay sesión: si el token cambia,
// el backend lo actualiza.
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { status: 'unavailable', reason: 'Las notificaciones push necesitan un celular físico.' };
  }
  if (isRunningInExpoGo() && Platform.OS === 'android') {
    return {
      status: 'unavailable',
      reason: 'Expo Go no recibe push en Android. Instala la development build de NotiU.',
    };
  }

  await ensureAndroidChannel();

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return { status: 'denied' };

  const projectId = getProjectId();
  if (!projectId) {
    return {
      status: 'unavailable',
      reason: 'Falta el projectId de EAS. Ejecuta "npx eas-cli@latest init" en mobile/.',
    };
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  await apiRequest('/devices', {
    method: 'POST',
    body: JSON.stringify({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
  });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

  return { status: 'registered', token };
}

// Antes de cerrar sesión: el backend deja de enviar push a este dispositivo.
// Debe llamarse mientras la sesión sigue abierta (necesita el ID token).
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await apiRequest('/devices', { method: 'DELETE', body: JSON.stringify({ token }) });
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

// Al tocar una notificación: marca la notificación como leída y abre la tarea
// correspondiente; si no trae tarea, abre la lista de notificaciones.
export function openFromNotification(response: Notifications.NotificationResponse): void {
  const data = (response.notification.request.content.data ?? {}) as PushData;

  if (data.notificationId) {
    apiRequest(`/notifications/${data.notificationId}/read`, { method: 'PATCH' }).catch(() => {
      // No es grave si falla: se marcará al abrir la lista
    });
  }

  if (!navigationRef.isReady()) return;

  if (data.taskId) {
    navigationRef.navigate('TaskDetail', { taskId: data.taskId });
  } else {
    navigationRef.navigate('Notifications');
  }
}
