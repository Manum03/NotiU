// Conexiones con plataformas (Moodle y Google Classroom): estado, última sincronización,
// sincronizar ahora, reconectar y desconectar.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest, isApiError } from '../../../services/api/api';
import { getAuthErrorMessage } from '../../../services/auth/authService';
import { colors } from '../../../config/theme';
import { FONTS } from '../../../core/theme/fonts';
import NotiUButton from '../../../shared/components/NotiUButton';
import ScreenHeader from '../../../shared/components/ScreenHeader';
import type {
  IntegrationDto,
  IntegrationProvider,
  IntegrationsResponse,
  SyncResult,
} from '../../../models/integration';
import { formatRelative } from '../../tasks/utils/taskTiming';
import { useClassroomConnect } from '../hooks/useClassroomConnect';

type Props = NativeStackScreenProps<RootStackParamList, 'Integrations'>;

const PROVIDER_ICON = {
  moodle: 'school',
  classroom: 'graduation-cap',
} as const;

const PROVIDER_HINT: Record<IntegrationProvider, string> = {
  moodle: 'Con el enlace de "Exportar calendario". No pedimos tu contraseña.',
  classroom: 'Con tu cuenta de Google, solo lectura de cursos y tareas.',
};

// Texto y color del estado de la conexión
function statusOf(item: IntegrationDto): { label: string; color: string } {
  if (!item.connected) return { label: 'Sin conectar', color: colors.soft };
  if (item.status === 'needs_reauth') return { label: 'Debes reconectar', color: colors.warning };
  if (item.status === 'error') return { label: 'Con errores', color: colors.danger };
  return { label: 'Conectado', color: colors.success };
}

export default function IntegrationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<IntegrationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Proveedor con una acción en curso (sincronizar o desconectar)
  const [busy, setBusy] = useState<IntegrationProvider | null>(null);
  const classroom = useClassroomConnect();

  const load = useCallback(async () => {
    try {
      const response = await apiRequest<IntegrationsResponse>('/integrations', { method: 'GET' });
      setItems(response.data ?? []);
    } catch (err) {
      Alert.alert('No se pudieron cargar las conexiones', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Conectar o reconectar
  const connect = async (provider: IntegrationProvider) => {
    if (provider === 'moodle') {
      navigation.navigate('ConnectMoodle');
      return;
    }
    try {
      const result = await classroom.connect();
      if (!result) return; // canceló
      Alert.alert(
        '¡Classroom conectado!',
        `Importamos ${result.sync.created} tarea${result.sync.created === 1 ? '' : 's'}. Te avisaremos antes de cada entrega.`
      );
      load();
    } catch (err) {
      Alert.alert('No se pudo conectar Classroom', getAuthErrorMessage(err));
    }
  };

  const syncNow = async (provider: IntegrationProvider) => {
    try {
      setBusy(provider);
      const result = await apiRequest<SyncResult>(`/integrations/${provider}/sync`, { method: 'POST' });
      Alert.alert(
        'Sincronizado',
        result.created + result.updated > 0
          ? `${result.created} nueva(s) y ${result.updated} actualizada(s).`
          : 'Todo está al día.'
      );
      load();
    } catch (err) {
      if (isApiError(err, 429)) {
        Alert.alert('Espera un minuto', 'Acabas de sincronizar. Espera un minuto antes de intentarlo de nuevo.');
      } else {
        Alert.alert('No se pudo sincronizar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
      }
    } finally {
      setBusy(null);
    }
  };

  const disconnect = (item: IntegrationDto) => {
    Alert.alert(
      `Desconectar ${item.label}`,
      `Se borrarán las tareas importadas de ${item.label}. Tus tareas creadas en NotiU no se tocan.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(item.provider);
              await apiRequest(`/integrations/${item.provider}`, { method: 'DELETE' });
              load();
            } catch (err) {
              Alert.alert('No se pudo desconectar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <ScreenHeader
          title="CONEXIONES"
          subtitle="Trae tus entregas de Moodle y Classroom a NotiU y recibe avisos antes de cada fecha."
          icon="link"
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : (
          items.map((item) => {
            const status = statusOf(item);
            const needsReauth = item.connected && item.status === 'needs_reauth';
            const working = busy === item.provider || (item.provider === 'classroom' && classroom.connecting);

            return (
              <View key={item.provider} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.icon}>
                    <Lucide name={PROVIDER_ICON[item.provider]} size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.label}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.dot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                </View>

                {item.connected ? (
                  <View style={styles.details}>
                    {item.displayName ? <Text style={styles.detail}>{item.displayName}</Text> : null}
                    <Text style={styles.detail}>
                      Última sincronización: {item.lastSyncAt ? formatRelative(item.lastSyncAt) : 'nunca'}
                      {item.lastStats ? ` · ${item.lastStats.total} tarea(s)` : ''}
                    </Text>
                    {item.lastError ? (
                      <Text style={[styles.detail, { color: colors.danger }]}>{item.lastError}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.detail}>{PROVIDER_HINT[item.provider]}</Text>
                )}

                <View style={styles.actions}>
                  {!item.connected || needsReauth ? (
                    <NotiUButton
                      title={needsReauth ? 'reconectar' : 'conectar'}
                      icon={needsReauth ? 'refresh-ccw' : 'plug'}
                      loading={working}
                      onPress={() => connect(item.provider)}
                    />
                  ) : (
                    <NotiUButton
                      title="sincronizar ahora"
                      icon="refresh-cw"
                      loading={working}
                      onPress={() => syncNow(item.provider)}
                    />
                  )}
                  {item.connected ? (
                    <NotiUButton
                      title="desconectar"
                      icon="unlink"
                      variant="outline"
                      disabled={working}
                      onPress={() => disconnect(item)}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.title,
    fontSize: 24,
    color: colors.text,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  details: {
    gap: 4,
  },
  detail: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  actions: {
    gap: 10,
  },
});
