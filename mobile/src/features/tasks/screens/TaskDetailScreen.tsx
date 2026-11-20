// Detalle de una tarea (creada en NotiU o importada de Moodle/Classroom).
// En las importadas no se edita título, descripción, tipo ni fecha (el backend responde 400):
// solo se marcan como realizadas y se manejan las subtareas.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest } from '../../../services/api/api';
import { colors } from '../../../config/theme';
import { FONTS } from '../../../core/theme/fonts';
import NotiUButton from '../../../shared/components/NotiUButton';
import ScreenHeader from '../../../shared/components/ScreenHeader';
import {
  SOURCE_LABEL,
  type TaskDto,
  type TaskMutationResponse,
  type TaskResponse,
} from '../../../models/task';
import { formatDue, getUrgency, URGENCY_LABEL, urgencyColor } from '../utils/taskTiming';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

const STATUS_LABEL: Record<TaskDto['status'], string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  realizada: 'Realizada',
};

const PRIORITY_LABEL: Record<TaskDto['priority'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

export default function TaskDetailScreen({ navigation, route }: Props) {
  const { taskId } = route.params;

  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const loadTask = useCallback(async () => {
    try {
      setError('');
      const response = await apiRequest<TaskResponse>(`/tasks/${taskId}`, { method: 'GET' });
      setTask(response.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la tarea.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId]);

  // Se recarga al volver (p. ej. después de editarla)
  useFocusEffect(
    useCallback(() => {
      loadTask();
    }, [loadTask])
  );

  // Marcar como realizada (PATCH /complete) o deshacer (PATCH { status: "pendiente" })
  const toggleDone = async () => {
    if (!task) return;
    try {
      setWorking(true);
      const response =
        task.status === 'realizada'
          ? await apiRequest<TaskMutationResponse>(`/tasks/${task.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'pendiente' }),
            })
          : await apiRequest<TaskMutationResponse>(`/tasks/${task.id}/complete`, {
              method: 'PATCH',
            });
      setTask(response.task);
    } catch (err) {
      Alert.alert('No se pudo actualizar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setWorking(false);
    }
  };

  // Marca o desmarca una subtarea (se envía la lista completa)
  const toggleSubtask = async (subtaskId: string) => {
    if (!task || working) return;
    const subtasks = task.subtasks.map((item) =>
      item.id === subtaskId ? { ...item, completed: !item.completed } : item
    );
    try {
      setWorking(true);
      const response = await apiRequest<TaskMutationResponse>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ subtasks }),
      });
      setTask(response.task);
    } catch (err) {
      Alert.alert('No se pudo actualizar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setWorking(false);
    }
  };

  const openInPlatform = async () => {
    if (!task?.url) return;
    try {
      await Linking.openURL(task.url);
    } catch {
      Alert.alert('No se pudo abrir el enlace', 'Copia el enlace y ábrelo en el navegador.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const imported = task ? task.source !== 'MANUAL' : false;
  const urgency = task ? getUrgency(task) : 'sinFecha';
  const accent = task ? urgencyColor(task) : colors.primary;

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
              loadTask();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <ScreenHeader
          title="DETALLE DE LA TAREA"
          icon={imported ? (task?.source === 'MOODLE' ? 'school' : 'graduation-cap') : 'notebook-pen'}
          onBack={() => navigation.goBack()}
        />

        {!task ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error || 'La tarea no existe.'}</Text>
            <NotiUButton title="reintentar" variant="outline" onPress={loadTask} />
          </View>
        ) : (
          <>
            {/* DATOS PRINCIPALES */}
            <View style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
              <View style={styles.badges}>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceText}>{SOURCE_LABEL[task.source]}</Text>
                </View>
                {task.status !== 'realizada' && (
                  <View style={[styles.urgencyBadge, { borderColor: accent }]}>
                    <View style={[styles.dot, { backgroundColor: accent }]} />
                    <Text style={[styles.urgencyText, { color: accent }]}>
                      {URGENCY_LABEL[urgency]}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.title}>{task.title}</Text>
              {task.courseName ? <Text style={styles.course}>{task.courseName}</Text> : null}

              <View style={styles.infoRow}>
                <Lucide name="calendar-clock" size={17} color={task.isOverdue ? colors.danger : colors.muted} />
                <Text style={[styles.infoText, task.isOverdue && { color: colors.danger }]}>
                  {formatDue(task, true)}
                  {task.isOverdue ? ' · vencida' : ''}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Lucide name="flag" size={17} color={colors.muted} />
                <Text style={styles.infoText}>
                  Prioridad {PRIORITY_LABEL[task.priority].toLowerCase()} · {STATUS_LABEL[task.status]}
                </Text>
              </View>
            </View>

            {/* DESCRIPCIÓN */}
            {task.description.trim() !== '' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>DESCRIPCIÓN</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            )}

            {/* SUBTAREAS */}
            {task.subtasks.length > 0 && (
              <View style={styles.card}>
                <View style={styles.subtaskHeader}>
                  <Text style={styles.cardTitle}>SUBTAREAS</Text>
                  <Text style={styles.progressText}>{task.progress}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${task.progress}%` }]} />
                </View>
                {task.subtasks.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.subtaskRow}
                    onPress={() => toggleSubtask(item.id)}
                    disabled={working}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.completed }}
                  >
                    <Lucide
                      name={item.completed ? 'square-check' : 'square'}
                      size={21}
                      color={item.completed ? colors.primary : colors.muted}
                    />
                    <Text style={[styles.subtaskText, item.completed && styles.subtaskDone]}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* ACCIONES */}
            <View style={styles.actions}>
              {task.url ? (
                <NotiUButton
                  title={`abrir en ${SOURCE_LABEL[task.source].toLowerCase()}`}
                  icon="external-link"
                  variant="outline"
                  onPress={openInPlatform}
                />
              ) : null}

              <NotiUButton
                title={task.status === 'realizada' ? 'marcar como pendiente' : 'marcar como realizada'}
                icon={task.status === 'realizada' ? 'rotate-ccw' : 'circle-check'}
                loading={working}
                onPress={toggleDone}
              />

              {imported ? (
                <Text style={styles.hint}>
                  Esta tarea viene de {SOURCE_LABEL[task.source]}: el título, la descripción y la fecha
                  se actualizan solos al sincronizar.
                </Text>
              ) : (
                <NotiUButton
                  title="editar"
                  icon="pencil"
                  variant="outline"
                  onPress={() => navigation.navigate('AddTask', { taskId: task.id })}
                />
              )}
            </View>
          </>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBadge: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sourceText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: colors.text,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 30,
    color: colors.text,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  course: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: colors.muted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.muted,
  },
  cardTitle: {
    fontFamily: FONTS.title,
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  subtaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: FONTS.title,
    fontSize: 20,
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  subtaskText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.text,
  },
  subtaskDone: {
    color: colors.soft,
    textDecorationLine: 'line-through',
  },
  actions: {
    gap: 12,
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.soft,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
