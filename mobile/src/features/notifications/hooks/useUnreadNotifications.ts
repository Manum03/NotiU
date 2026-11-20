// Cantidad de notificaciones sin leer (meta.unreadCount). Se actualiza cada vez que la
// pantalla que lo usa toma el foco, y también pone el número en el icono de la app.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import type { NotificationsResponse } from '../../../models/notification';
import { apiRequest } from '../../../services/api/api';

export function useUnreadNotifications(): number {
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      apiRequest<NotificationsResponse>('/notifications?page=1&limit=1', { method: 'GET' })
        .then((response) => {
          if (!active) return;
          setUnread(response.meta.unreadCount);
          Notifications.setBadgeCountAsync(response.meta.unreadCount).catch(() => {});
        })
        .catch(() => {
          // Sin conexión: se deja el último valor
        });
      return () => {
        active = false;
      };
    }, [])
  );

  return unread;
}
