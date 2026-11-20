// Lista de notificaciones (tareas nuevas, cambios de fecha, recordatorios, resúmenes).
// Tocar una la marca como leída y abre la tarea si tiene una asociada.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';
import * as Notifications from 'expo-notifications';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest } from '../../../services/api/api';
import { colors } from '../../../config/theme';
import { FONTS } from '../../../core/theme/fonts';
import ScreenHeader from '../../../shared/components/ScreenHeader';
import type {
  NotificationDto,
  NotificationKind,
  NotificationsResponse,
} from '../../../models/notification';
import { formatRelative } from '../../tasks/utils/taskTiming';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const PAGE_SIZE = 20;

// Icono según el tipo de aviso
const KIND_ICON = {
  NEW_TASK: 'file-plus',
  DUE_DATE_CHANGED: 'calendar-sync',
  REMINDER: 'alarm-clock',
  SYNC_SUMMARY: 'refresh-cw',
  SYSTEM: 'info',
} as const satisfies Record<NotificationKind, string>;

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Contador de no leídas en pantalla y en el icono de la app
  const updateUnread = (count: number) => {
    setUnread(count);
    Notifications.setBadgeCountAsync(count).catch(() => {});
  };

  // Carga una página; la 1 reemplaza la lista y las demás se agregan al final
  const loadPage = useCallback(async (target: number) => {
    try {
      const response = await apiRequest<NotificationsResponse>(
        `/notifications?page=${target}&limit=${PAGE_SIZE}`,
        { method: 'GET' }
      );
      setItems((current) => (target === 1 ? response.data : [...current, ...response.data]));
      setPage(response.meta.page);
      setTotalPages(response.meta.totalPages);
      setUnread(response.meta.unreadCount);
      Notifications.setBadgeCountAsync(response.meta.unreadCount).catch(() => {});
    } catch (err) {
      Alert.alert(
        'No se pudieron cargar las notificaciones',
        err instanceof Error ? err.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  const loadMore = () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    loadPage(page + 1);
  };

  const open = (item: NotificationDto) => {
    if (!item.isRead) {
      // Se marca en pantalla de una vez; si falla, se corrige al recargar
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      updateUnread(Math.max(0, unread - 1));
      apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
    }
    if (item.taskId) navigation.navigate('TaskDetail', { taskId: item.taskId });
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setItems((current) => current.map((n) => ({ ...n, isRead: true })));
      updateUnread(0);
    } catch (err) {
      Alert.alert('No se pudo actualizar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    }
  };

  const renderItem = ({ item }: { item: NotificationDto }) => (
    <Pressable
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => open(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.isRead ? '' : 'Sin leer. '}${item.title}`}
    >
      <View style={[styles.itemIcon, item.category === 'URGENT' && styles.itemIconUrgent]}>
        <Lucide name={KIND_ICON[item.kind] ?? 'bell'} size={21} color={colors.text} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemTitle, !item.isRead && styles.bold]} numberOfLines={2}>
            {item.title}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.itemText} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={styles.itemMeta}>{formatRelative(item.createdAt)}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPage(1);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <ScreenHeader
            title="NOTIFICACIONES"
            subtitle={unread > 0 ? `Tienes ${unread} sin leer.` : 'Estás al día.'}
            icon="bell"
            onBack={() => navigation.goBack()}
            right={
              unread > 0 ? (
                <Pressable
                  style={styles.readAll}
                  onPress={markAllRead}
                  accessibilityRole="button"
                  accessibilityLabel="Marcar todas como leídas"
                >
                  <Lucide name="check-check" size={16} color={colors.text} />
                  <Text style={styles.readAllText}>Marcar todas</Text>
                </Pressable>
              ) : undefined
            }
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <View style={styles.empty}>
              <Lucide name="bell-off" size={34} color={colors.primary} />
              <Text style={styles.emptyText}>Aún no tienes notificaciones.</Text>
              <Text style={styles.emptySub}>
                Conecta Moodle o Classroom para recibir avisos de tus entregas.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 52,
    paddingHorizontal: 22,
    paddingBottom: 50,
  },
  readAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryDeep,
  },
  readAllText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surfaceDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  itemUnread: {
    borderColor: colors.primary,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconUrgent: {
    backgroundColor: colors.primary,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: colors.text,
  },
  bold: {
    fontFamily: FONTS.bodyBold,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    backgroundColor: colors.primary,
  },
  itemText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  itemMeta: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.soft,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    marginTop: 30,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: colors.text,
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
});
