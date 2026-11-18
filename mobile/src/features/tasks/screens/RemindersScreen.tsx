
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Lucide } from '@react-native-vector-icons/lucide';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FONTS } from '../../../core/theme/fonts';
import { COLORS } from '../../subjects/types';
import BottomNavigation from '../../home/components/BottomNavigation';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'Tasks'>;

type Task = {
  id: string;
  title: string;
  description: string;
  type: 'tarea' | 'recordatorio' | 'nota';
  status: 'pendiente' | 'en_curso' | 'realizada';
  priority: 'baja' | 'media' | 'alta';
  subjectId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
  }[];
};

type TasksResponse = {
  tasks: Task[];
  total: number;
};

type Filter = 'todo' | 'nota' | 'recordatorio' | 'checklist' | 'tarea';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'nota', label: 'Notas' },
  { id: 'recordatorio', label: 'Recordatorios' },
  { id: 'checklist', label: 'Checklists' },
  { id: 'tarea', label: 'Tareas' },
];

function getTaskCategory(task: Task): Filter {
  if (task.type === 'nota') return 'nota';
  if (task.type === 'recordatorio') return 'recordatorio';
  if (task.subtasks && task.subtasks.length > 0) return 'checklist';
  return 'tarea';
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';

  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export default function RemindersScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('todo');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const loadTasks = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError('');

      const session = await getSession();

      if (!session?.token) {
        throw new Error('No se encontró una sesión activa.');
      }

      const response = await apiRequest<TasksResponse>('/tasks', {
        method: 'GET',
        token: session.token,
      });

      setTasks(response.tasks ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar tus actividades.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks(false);
  }, [loadTasks]);

  const counts = useMemo(() => ({
    nota: tasks.filter(task => getTaskCategory(task) === 'nota').length,
    recordatorio: tasks.filter(task => getTaskCategory(task) === 'recordatorio').length,
    checklist: tasks.filter(task => getTaskCategory(task) === 'checklist').length,
    tarea: tasks.filter(task => getTaskCategory(task) === 'tarea').length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tasks.filter(task => {
      const category = getTaskCategory(task);

      const matchesFilter =
        activeFilter === 'todo' || category === activeFilter;

      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [tasks, search, activeFilter]);

  const openForm = (type: 'tarea' | 'recordatorio' | 'nota' | 'checklist') => {
    setShowCreateMenu(false);
    navigation.navigate('AddTask', { type });
  };

  const renderTaskCard = (task: Task) => {
    const category = getTaskCategory(task);
    const completed = task.status === 'realizada';
    const totalSubtasks = task.subtasks?.length ?? 0;
    const completedSubtasks =
      task.subtasks?.filter(item => item.completed).length ?? 0;

    const categoryInfo = {
      nota: {
        label: 'NOTA PERSONAL',
        icon: 'notebook-pen' as const,
      },
      recordatorio: {
        label: 'RECORDATORIO',
        icon: 'bell-ring' as const,
      },
      checklist: {
        label: 'CHECKLIST',
        icon: 'list-checks' as const,
      },
      tarea: {
        label: 'TAREA',
        icon: 'clipboard-list' as const,
      },
    }[category];

    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.cardTop}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryIcon}>
              <Lucide
                name={categoryInfo.icon}
                size={16}
                color={COLORS.brightWine}
              />
            </View>
            <Text style={styles.categoryLabel}>
              {categoryInfo.label}
            </Text>
          </View>

          <View style={[
            styles.statusDot,
            completed && styles.statusDotCompleted,
          ]} />
        </View>

        <Text style={[
          styles.taskTitle,
          completed && styles.completedText,
        ]}>
          {task.title}
        </Text>

        {!!task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        {category === 'checklist' && (
          <View style={styles.checklistProgress}>
            <View style={styles.checklistProgressText}>
              <Text style={styles.progressLabel}>PROGRESO DE LA LISTA</Text>
              <Text style={styles.progressNumber}>
                {completedSubtasks}/{totalSubtasks}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${totalSubtasks
                      ? (completedSubtasks / totalSubtasks) * 100
                      : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Lucide
              name="calendar-days"
              size={14}
              color={COLORS.soft}
            />
            <Text style={styles.dateText}>
              {formatDate(task.dueDate)}
            </Text>
          </View>

          {task.dueTime && (
            <View style={styles.dateRow}>
              <Lucide name="clock-3" size={14} color={COLORS.soft} />
              <Text style={styles.dateText}>{task.dueTime}</Text>
            </View>
          )}

          <Text style={[
            styles.stateText,
            completed && styles.completedState,
          ]}>
            {completed ? 'COMPLETADA' : 'PENDIENTE'}
          </Text>
        </View>
      </View>
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
            onRefresh={onRefresh}
            tintColor={COLORS.brightWine}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TU ESPACIO PERSONAL</Text>
            <Text style={styles.title}>Mi libreta</Text>
            <Text style={styles.subtitle}>
              Tus ideas y pendientes, organizados en un solo lugar.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Lucide
              name="notebook-pen"
              size={25}
              color={COLORS.brightWine}
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{counts.nota}</Text>
            <Text style={styles.statLabel}>NOTAS</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{counts.recordatorio}</Text>
            <Text style={styles.statLabel}>RECORDATORIOS</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{counts.checklist}</Text>
            <Text style={styles.statLabel}>LISTAS</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>TU CONTENIDO</Text>
          <Text style={styles.totalLabel}>
            {tasks.length} {tasks.length === 1 ? 'elemento' : 'elementos'}
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Lucide name="search" size={19} color={COLORS.soft} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar en mi libreta..."
            placeholderTextColor={COLORS.soft}
            style={styles.searchInput}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <Lucide name="x" size={18} color={COLORS.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map(filter => (
            <Pressable
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
              ]}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter.id && styles.filterTextActive,
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>
            {activeFilter === 'todo'
              ? 'RECIENTES'
              : FILTERS.find(item => item.id === activeFilter)?.label.toUpperCase()}
          </Text>
        </View>

        {loading ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" color={COLORS.brightWine} />
            <Text style={styles.messageText}>Organizando tu libreta...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageContainer}>
            <Lucide name="cloud-alert" size={30} color={COLORS.soft} />
            <Text style={styles.messageText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => loadTasks()}
            >
              <Text style={styles.retryText}>VOLVER A INTENTAR</Text>
            </Pressable>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Lucide
                name="notebook-pen"
                size={29}
                color={COLORS.brightWine}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {search
                ? 'No encontramos resultados'
                : activeFilter === 'todo'
                  ? 'Tu libreta está esperando'
                  : 'Todavía no hay contenido aquí'}
            </Text>
            <Text style={styles.emptyDescription}>
              {search
                ? 'Prueba con otra palabra.'
                : 'Crea tu primera nota, recordatorio o lista para comenzar.'}
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.map(renderTaskCard)}
          </View>
        )}
      </ScrollView>

      {showCreateMenu && (
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setShowCreateMenu(false)}
        >
          <View style={styles.createMenu}>
            <Text style={styles.menuTitle}>¿Qué deseas crear?</Text>

            <Pressable
              style={styles.menuOption}
              onPress={() => openForm('nota')}
            >
              <Lucide name="notebook-pen" size={20} color={COLORS.brightWine} />
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>Nueva nota</Text>
                <Text style={styles.menuOptionDescription}>
                  Guarda ideas y apuntes.
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.menuOption}
              onPress={() => openForm('recordatorio')}
            >
              <Lucide name="bell-ring" size={20} color={COLORS.brightWine} />
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>Nuevo recordatorio</Text>
                <Text style={styles.menuOptionDescription}>
                  Ten presentes tus pendientes.
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.menuOption}
              onPress={() => openForm('checklist')}
            >
              <Lucide name="list-checks" size={20} color={COLORS.brightWine} />
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>Nueva checklist</Text>
                <Text style={styles.menuOptionDescription}>
                  Divide tus tareas en pasos.
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.menuOption}
              onPress={() => openForm('tarea')}
            >
              <Lucide name="clipboard-list" size={20} color={COLORS.brightWine} />
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>Nueva tarea</Text>
                <Text style={styles.menuOptionDescription}>
                  Registra una actividad.
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      )}

      <Pressable
        style={styles.fab}
        onPress={() => setShowCreateMenu(current => !current)}
      >
        <Lucide
          name={showCreateMenu ? 'x' : 'plus'}
          size={25}
          color={COLORS.white}
        />
      </Pressable>

      <BottomNavigation
        activeScreen="Tasks"
        onHome={() => navigation.navigate('Home')}
        onSubjects={() => navigation.navigate('Subjects')}
        onTasks={() => navigation.navigate('Tasks')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 125,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  eyebrow: {
    color: COLORS.brightWine,
    fontFamily: FONTS.medium,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 7,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 35,
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 5,
    maxWidth: 270,
    lineHeight: 19,
  },
  headerIcon: {
    width: 51,
    height: 51,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minHeight: 91,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 13,
    justifyContent: 'center',
  },
  statNumber: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 27,
  },
  statLabel: {
    color: COLORS.soft,
    fontFamily: FONTS.medium,
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 12,
    letterSpacing: 1.3,
  },
  totalLabel: {
    color: COLORS.soft,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  searchBox: {
    minHeight: 49,
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
    paddingVertical: 11,
  },
  filters: {
    gap: 8,
    paddingBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.wine,
    borderColor: COLORS.brightWine,
  },
  filterText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  filterTextActive: {
    color: COLORS.text,
  },
  listHeading: {
    marginBottom: 14,
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: COLORS.brightWine,
    fontFamily: FONTS.medium,
    fontSize: 9,
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: COLORS.orange,
  },
  statusDotCompleted: {
    backgroundColor: '#8A9B78',
  },
  taskTitle: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  completedText: {
    color: COLORS.muted,
  },
  taskDescription: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  checklistProgress: {
    marginTop: 17,
  },
  checklistProgressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: COLORS.soft,
    fontFamily: FONTS.medium,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  progressNumber: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.darkWine,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.brightWine,
    borderRadius: 5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 16,
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: COLORS.soft,
    fontFamily: FONTS.body,
    fontSize: 10,
  },
  stateText: {
    color: COLORS.orange,
    fontFamily: FONTS.medium,
    fontSize: 9,
    marginLeft: 'auto',
  },
  completedState: {
    color: '#A4B48F',
  },
  messageContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  messageText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    backgroundColor: COLORS.wine,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 5,
  },
  retryText: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  createMenu: {
    backgroundColor: COLORS.cardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 21,
    padding: 18,
  },
  menuTitle: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 22,
    marginBottom: 12,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  menuOptionText: {
    flex: 1,
  },
  menuOptionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  menuOptionDescription: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
    marginTop: 3,
  },
  fab: {
    position: 'absolute',
    right: 23,
    bottom: 91,
    width: 55,
    height: 55,
    borderRadius: 19,
    backgroundColor: COLORS.brightWine,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
