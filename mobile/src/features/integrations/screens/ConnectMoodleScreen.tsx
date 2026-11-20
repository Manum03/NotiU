// Conectar Moodle con el enlace de exportación del calendario (iCal).
// No se pide la contraseña del estudiante: el backend guarda el enlace cifrado
// y revisa las entregas cada 30 minutos.
import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Lucide } from '@react-native-vector-icons/lucide';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest } from '../../../services/api/api';
import { FONTS } from '../../../core/theme/fonts';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectMoodle'>;

// Respuestas del backend (/integrations)
type Integration = {
  provider: 'moodle' | 'classroom';
  connected: boolean;
  status: 'active' | 'error' | 'needs_reauth' | null;
  displayName: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  lastStats: { total: number; created: number; updated: number; notified: number } | null;
};

type SyncResult = { total: number; created: number; updated: number; notified: number };

type ConnectResponse = { message: string; integration: Integration; sync: SyncResult };

const COLORS = {
  background: '#10060A',
  card: '#260A13',
  wine: '#800427',
  brightWine: '#AA0330',
  darkWine: '#4E021A',
  text: '#E9DDD3',
  muted: '#C9B8B1',
  soft: '#80666C',
  border: '#572033',
};

const STEPS = [
  'Entra a Moodle desde el navegador y abre el Calendario.',
  'Toca "Importar o exportar calendarios" y luego "Exportar calendario".',
  'En "Eventos a exportar" elige Todos y en "Período" elige Eventos recientes y próximos.',
  'Toca "Obtener URL del calendario" y copia el enlace que aparece.',
  'Pégalo aquí abajo y toca Conectar.',
];

const formatDateTime = (value: string | null): string =>
  value
    ? new Date(value).toLocaleString('es-CO', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Nunca';

export default function ConnectMoodleScreen({ navigation }: Props) {
  const [icalUrl, setIcalUrl] = useState('');
  const [moodle, setMoodle] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  // Consulta si Moodle ya está conectado
  const loadStatus = useCallback(async () => {
    try {
      const response = await apiRequest<{ data: Integration[] }>('/integrations', { method: 'GET' });
      setMoodle(response.data.find((item) => item.provider === 'moodle') ?? null);
    } catch (err) {
      Alert.alert(
        'No se pudo consultar Moodle',
        err instanceof Error ? err.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarga el estado cada vez que la pantalla toma el foco (mismo patrón que Materias)
  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  // Envía el enlace al backend: lo valida descargándolo y sincroniza de una vez
  const connect = async () => {
    const value = icalUrl.trim();

    if (!value) {
      Alert.alert('Falta el enlace', 'Pega el enlace del calendario de Moodle.');
      return;
    }

    if (!/^(https?|webcal):\/\//i.test(value)) {
      Alert.alert('Enlace no válido', 'El enlace debe empezar por https:// o webcal://');
      return;
    }

    try {
      setWorking(true);
      const result = await apiRequest<ConnectResponse>('/integrations/moodle', {
        method: 'PUT',
        body: JSON.stringify({ icalUrl: value }),
      });

      setIcalUrl('');
      setMoodle(result.integration);

      Alert.alert(
        '¡Moodle conectado!',
        result.sync.total > 0
          ? `Importamos ${result.sync.total} actividad${result.sync.total === 1 ? '' : 'es'}. Te avisaremos antes de cada entrega.`
          : 'No encontramos entregas próximas. Te avisaremos cuando aparezca una nueva.',
        [{ text: 'Ver mis tareas', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(
        'No se pudo conectar Moodle',
        err instanceof Error ? err.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setWorking(false);
    }
  };

  const syncNow = async () => {
    try {
      setWorking(true);
      const result = await apiRequest<SyncResult>('/integrations/moodle/sync', { method: 'POST' });
      await loadStatus();
      Alert.alert(
        'Sincronizado',
        result.created + result.updated > 0
          ? `${result.created} nueva(s) y ${result.updated} actualizada(s).`
          : 'Todo está al día.'
      );
    } catch (err) {
      Alert.alert(
        'No se pudo sincronizar',
        err instanceof Error ? err.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setWorking(false);
    }
  };

  const disconnect = () => {
    Alert.alert(
      'Desconectar Moodle',
      'Se borrarán las tareas importadas de Moodle. Tus tareas creadas en NotiU no se tocan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true);
              await apiRequest('/integrations/moodle', { method: 'DELETE' });
              setMoodle(null);
            } catch (err) {
              Alert.alert(
                'No se pudo desconectar',
                err instanceof Error ? err.message : 'Inténtalo de nuevo.'
              );
            } finally {
              setWorking(false);
            }
          },
        },
      ]
    );
  };

  const connected = Boolean(moodle?.connected);
  const needsReauth = moodle?.status === 'needs_reauth';

  return (
    <View style={styles.container}>
      {/* BOTÓN VOLVER */}
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Lucide name="arrow-left" size={21} color={COLORS.text} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Lucide name="school" size={26} color={COLORS.brightWine} />
          </View>
          <Text style={styles.title}>CONECTAR MOODLE</Text>
          <Text style={styles.subtitle}>
            Recibe un aviso cada vez que te asignen una entrega y un recordatorio antes de que venza.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.brightWine} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* ESTADO DE LA CONEXIÓN */}
            {connected && (
              <View style={styles.card}>
                <View style={styles.statusRow}>
                  <Lucide
                    name={needsReauth ? 'triangle-alert' : 'circle-check'}
                    size={20}
                    color={COLORS.brightWine}
                  />
                  <Text style={styles.statusTitle}>
                    {needsReauth ? 'Debes reconectar' : 'Conectado'}
                  </Text>
                </View>
                <Text style={styles.statusText}>{moodle?.displayName}</Text>
                <Text style={styles.statusText}>
                  Última sincronización: {formatDateTime(moodle?.lastSyncAt ?? null)}
                </Text>
                {moodle?.lastStats && (
                  <Text style={styles.statusText}>
                    {moodle.lastStats.total} actividad(es) en el calendario
                  </Text>
                )}
                {moodle?.lastError && (
                  <Text style={[styles.statusText, { color: COLORS.brightWine }]}>
                    {moodle.lastError}
                  </Text>
                )}

                <View style={styles.actionsRow}>
                  {!needsReauth && (
                    <Pressable style={styles.secondaryButton} onPress={syncNow} disabled={working}>
                      <Lucide name="refresh-cw" size={16} color={COLORS.text} />
                      <Text style={styles.secondaryText}>Sincronizar</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.secondaryButton} onPress={disconnect} disabled={working}>
                    <Lucide name="unlink" size={16} color={COLORS.text} />
                    <Text style={styles.secondaryText}>Desconectar</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* PASOS PARA OBTENER EL ENLACE */}
            {(!connected || needsReauth) && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>CÓMO OBTENER EL ENLACE</Text>
                  {STEPS.map((step, index) => (
                    <View key={step} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.label}>Enlace del calendario</Text>
                <TextInput
                  placeholder="https://moodle.tu-universidad.edu.co/calendar/export_execute.php?..."
                  placeholderTextColor={COLORS.soft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  multiline
                  style={styles.input}
                  value={icalUrl}
                  onChangeText={setIcalUrl}
                  editable={!working}
                />
                <Text style={styles.hint}>
                  Mantén presionado el campo para pegar. El enlace es privado: lo guardamos cifrado y nunca pedimos tu contraseña.
                </Text>

                <Pressable
                  style={[styles.buttonWrapper, working && { opacity: 0.6 }]}
                  onPress={connect}
                  disabled={working}
                >
                  <LinearGradient
                    colors={[COLORS.brightWine, COLORS.wine, COLORS.card]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.button}
                  >
                    {working ? (
                      <ActivityIndicator color={COLORS.text} />
                    ) : (
                      <Text style={styles.buttonText}>{needsReauth ? 'reconectar' : 'conectar'}</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  backButton: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingTop: 110,
    paddingHorizontal: 22,
    paddingBottom: 50,
  },

  header: {
    alignItems: 'center',
    marginBottom: 22,
  },

  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: COLORS.text,
    letterSpacing: 1,
  },

  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 20,
  },

  cardTitle: {
    fontFamily: FONTS.title,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.text,
  },

  stepText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },

  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },

  input: {
    minHeight: 80,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },

  hint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.soft,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 22,
  },

  buttonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  button: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontFamily: FONTS.title,
    fontSize: 22,
    color: COLORS.text,
    letterSpacing: 1,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  statusTitle: {
    fontFamily: FONTS.title,
    fontSize: 22,
    color: COLORS.text,
  },

  statusText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.darkWine,
  },

  secondaryText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
});
