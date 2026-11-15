
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lucide } from '@react-native-vector-icons/lucide';
import Svg, { Circle } from 'react-native-svg';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';

// ==================================================
// 1. TIPOS: estructura de los datos de NOTIU
// ==================================================

type TaskStatus = 'pendiente' | 'en_curso' | 'realizada';
type TaskType = 'tarea' | 'recordatorio' | 'nota';
type TaskPriority = 'baja' | 'media' | 'alta';

type Task = {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  subjectId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type TasksResponse = {
  tasks: Task[];
  total: number;
};

type UserInfo = {
  name?: string;
  username?: string;
  firstName?: string;
  email?: string;
};

// ==================================================
// 2. CONSTANTES: textos y colores de la aplicación
// ==================================================

const MONTHS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const WEEK_DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

const COLORS = {
  background: '#10060A',
  card: '#260A13',
  cardLight: '#35101D',
  wine: '#800427',
  brightWine: '#AA0330',
  darkWine: '#4E021A',
  text: '#E9DDD3',
  muted: '#C9B8B1',
  soft: '#80666C',
  border: '#572033',
  white: '#FFFFFF',
};

// ==================================================
// 3. UTILIDADES: funciones auxiliares
// ==================================================

// Convierte una fecha al formato YYYY-MM-DD.
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Convierte YYYY-MM-DD en una fecha que puede usar JavaScript.
function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Suma o resta días.
function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

// Obtiene el lunes de la semana correspondiente.
function getMonday(date: Date): Date {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

// Formatea fechas para mostrarlas en las actividades.
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

// Cambia el saludo según la hora del dispositivo.
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return '¡BUENOS DÍAS!';
  if (hour < 19) return '¡BUENAS TARDES!';
  return '¡BUENAS NOCHES!';
}

// Mensajes del pequeño compañero de NOTIU.
function getMotivationalMessage(): string {
  const messages = [
    'Cada pequeño avance cuenta.',
    'Vas construyendo algo grande.',
    'Un paso a la vez, vas muy bien.',
    'Tu esfuerzo de hoy construye tu futuro.',
    'Organizarte también es avanzar.',
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

// Obtiene el nombre que se muestra en el saludo.
function getUserName(user: UserInfo | null): string {
  if (!user) return 'ESTUDIANTE';

  return (
    user.name ||
    user.firstName ||
    user.username ||
    user.email?.split('@')[0] ||
    'ESTUDIANTE'
  ).toUpperCase();
}

// ==================================================
// 4. COMPONENTE PRINCIPAL
// ==================================================

export default function HomeScreen() {
  // ------------------------------------------------
  // ESTADOS: información que puede cambiar en pantalla
  // ------------------------------------------------

  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Fecha que el usuario tiene seleccionada.
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mes que se está mostrando en el calendario.
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  // Semana que se muestra en la sección de tareas del día.
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  // Controla si el formulario de selección de fecha está abierto.
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Valores temporales del formulario de fecha.
  const [formYear, setFormYear] = useState(
    String(new Date().getFullYear())
  );
  const [formMonth, setFormMonth] = useState(new Date().getMonth());
  const [formDay, setFormDay] = useState(
    String(new Date().getDate())
  );

  // Mensaje que aparece junto al zorro.
  const [motivationalMessage] = useState(getMotivationalMessage());

  // ------------------------------------------------
  // CONEXIÓN CON EL BACKEND: cargar las actividades
  // ------------------------------------------------

  const loadTasks = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      setError('');

      const session = await getSession();

      if (!session?.token) {
        throw new Error(
          'No se encontró una sesión activa. Inicia sesión nuevamente.'
        );
      }

      const response = await apiRequest<TasksResponse>('/tasks', {
        method: 'GET',
        token: session.token,
      });

      setTasks(response.tasks ?? []);
      setUser((session.user ?? null) as UserInfo | null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las actividades.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carga las tareas al entrar al Home.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Permite actualizar la pantalla deslizando hacia abajo.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks(false);
  }, [loadTasks]);

  // ------------------------------------------------
  // DATOS CALCULADOS: estadísticas y actividades
  // ------------------------------------------------

  const today = formatDate(new Date());

  // Actividades que todavía no se han completado.
  const unfinishedTasks = useMemo(
    () => tasks.filter(task => task.status !== 'realizada'),
    [tasks]
  );

  const pendingCount = unfinishedTasks.length;

  // Próximas actividades con fecha de hoy o posterior.
  const upcomingTasks = useMemo(() => {
    return unfinishedTasks
      .filter(task => task.dueDate && task.dueDate >= today)
      .sort((a, b) => {
        const dateComparison = (a.dueDate ?? '').localeCompare(
          b.dueDate ?? ''
        );

        if (dateComparison !== 0) return dateComparison;

        return (a.dueTime ?? '').localeCompare(b.dueTime ?? '');
      });
  }, [unfinishedTasks, today]);

  // Actividades que ya se completaron.
  const completedTasks = useMemo(
    () =>
      tasks
        .filter(task => task.status === 'realizada')
        .sort((a, b) =>
          (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
        ),
    [tasks]
  );

  const completedCount = completedTasks.length;
  const totalCount = tasks.length;

  // Porcentaje de actividades completadas.
  const progress =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  // Actividades que corresponden al día seleccionado.
  const selectedDayTasks = useMemo(
    () =>
      tasks
        .filter(
          task =>
            task.dueDate === formatDate(selectedDate) &&
            task.status !== 'realizada'
        )
        .sort((a, b) =>
          (a.dueTime ?? '').localeCompare(b.dueTime ?? '')
        ),
    [tasks, selectedDate]
  );

  // ------------------------------------------------
  // CALENDARIO: generar los días del mes
  // ------------------------------------------------

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Se generan las semanas necesarias para completar el calendario.
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(year, month, index - offset + 1);

      return {
        date,
        dateString: formatDate(date),
        isCurrentMonth: date.getMonth() === month,
      };
    });
  }, [visibleMonth]);

  // Días de la semana que aparecen en la sección de tareas.
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  // ------------------------------------------------
  // CALENDARIO: navegación y selección
  // ------------------------------------------------

  // Cambia el mes con las flechas.
  function changeMonth(direction: number) {
    setVisibleMonth(current =>
      new Date(
        current.getFullYear(),
        current.getMonth() + direction,
        1
      )
    );
  }

  // Selecciona un día desde el calendario.
  function selectCalendarDate(date: Date) {
    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setWeekStart(getMonday(date));
  }

  // Cambia la semana en la sección de tareas.
  function changeWeek(direction: number) {
    setWeekStart(current => addDays(current, direction * 7));
  }

  // Regresa al día actual.
  function goToToday() {
    const now = new Date();

    setSelectedDate(now);
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setWeekStart(getMonday(now));
  }

  // Abre el formulario y carga la fecha que está seleccionada.
  function openDateSelector() {
    setFormYear(String(selectedDate.getFullYear()));
    setFormMonth(selectedDate.getMonth());
    setFormDay(String(selectedDate.getDate()));
    setDateModalVisible(true);
  }

  // Confirma la fecha escrita en el formulario.
  function confirmManualDate() {
    const year = Number(formYear);
    const day = Number(formDay);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      Alert.alert('Año no válido', 'Escribe un año entre 2000 y 2100.');
      return;
    }

    const daysInMonth = new Date(year, formMonth + 1, 0).getDate();

    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > daysInMonth
    ) {
      Alert.alert(
        'Día no válido',
        `El mes seleccionado tiene ${daysInMonth} días.`
      );
      return;
    }

    const newDate = new Date(year, formMonth, day);

    selectCalendarDate(newDate);
    setDateModalVisible(false);
  }

  // ------------------------------------------------
  // ACCIONES: completar actividades
  // ------------------------------------------------

  async function completeTask(taskId: string) {
    try {
      const session = await getSession();

      if (!session?.token) {
        throw new Error('Tu sesión ha expirado.');
      }

      await apiRequest<{ task: Task }>(
        `/tasks/${taskId}/complete`,
        {
          method: 'PATCH',
          token: session.token,
        }
      );

      await loadTasks(false);
    } catch (err) {
      Alert.alert(
        'No se pudo actualizar',
        err instanceof Error ? err.message : 'Intenta nuevamente.'
      );
    }
  }

  // ------------------------------------------------
  // COMPONENTE VISUAL: fila de actividad
  // ------------------------------------------------

  function renderTaskRow(task: Task, showDate = false) {
    const statusLabel =
      task.status === 'en_curso' ? 'EN CURSO' : 'PENDIENTE';

    return (
      <View key={task.id} style={styles.activityRow}>
        <View
          style={[
            styles.activityBullet,
            {
              backgroundColor:
                task.status === 'en_curso'
                  ? COLORS.brightWine
                  : '#9C484F',
            },
          ]}
        />

        <View style={styles.activityInfo}>
          <Text style={styles.activitySubject}>{task.title}</Text>

          <Text style={styles.activityDate}>
            {showDate && task.dueDate
              ? formatShortDate(parseDate(task.dueDate))
              : task.dueTime
                ? `Hoy · ${task.dueTime}`
                : task.type.toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            task.status === 'en_curso'
              ? styles.inProgressBadge
              : styles.pendingBadge,
          ]}
        >
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        <Pressable
          onPress={() => completeTask(task.id)}
          style={styles.completeButton}
          accessibilityLabel={`Marcar ${task.title} como realizada`}
        >
          <Lucide
            name="circle-check"
            size={25}
            color={COLORS.brightWine}
          />
        </Pressable>
      </View>
    );
  }

  // ==================================================
  // 5. PANTALLA DE CARGA
  // ==================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../../../assets/images/logonotiU.png')}
          style={styles.loadingMascot}
          resizeMode="contain"
        />

        <ActivityIndicator color={COLORS.brightWine} size="large" />

        <Text style={styles.loadingText}>
          PREPARANDO TU ESPACIO...
        </Text>
      </View>
    );
  }

  // ==================================================
  // 6. INTERFAZ PRINCIPAL
  // ==================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brightWine}
            colors={[COLORS.brightWine]}
          />
        }
      >
        {/* ------------------------------------------
            ENCABEZADO: saludo, usuario y mascota
        ------------------------------------------ */}

        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logonotiU.png')}
            style={styles.mascot}
            resizeMode="contain"
          />

          <View style={styles.greetingContainer}>
            <Text style={styles.date}>
              {new Date()
                .toLocaleDateString('es-CO', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })
                .toUpperCase()}
            </Text>

            <Text style={styles.greeting}>{getGreeting()}</Text>

            <Text style={styles.userName} numberOfLines={1}>
              {getUserName(user)}
            </Text>

            <Text style={styles.description}>
              Un pequeño paso te acerca cada vez más a tus metas.
            </Text>
          </View>

          <View style={styles.headerIcons}>
            <View style={styles.iconButton}>
              <Lucide name="bell" size={23} color={COLORS.brightWine} />
            </View>

            <View style={styles.iconButton}>
              <Lucide name="user-round" size={23} color={COLORS.text} />
            </View>
          </View>
        </View>

        {/* ------------------------------------------
            ERROR: aparece si falla la conexión
        ------------------------------------------ */}

        {error !== '' ? (
          <View style={styles.errorCard}>
            <Lucide name="wifi-off" size={25} color={COLORS.text} />

            <View style={styles.errorInfo}>
              <Text style={styles.errorTitle}>
                No pudimos cargar tus actividades
              </Text>

              <Text style={styles.errorDescription}>{error}</Text>
            </View>

            <Pressable onPress={() => loadTasks()}>
              <Lucide
                name="refresh-cw"
                size={23}
                color={COLORS.brightWine}
              />
            </Pressable>
          </View>
        ) : null}

        {/* ------------------------------------------
            RESUMEN: indicadores rápidos
        ------------------------------------------ */}

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Lucide
                name="circle-check"
                size={27}
                color={COLORS.brightWine}
              />
            </View>

            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryNumber}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Tareas pendientes</Text>
            </View>

            <Lucide name="arrow-up-right" size={20} color={COLORS.soft} />
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Lucide
                name="files"
                size={27}
                color={COLORS.brightWine}
              />
            </View>

            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryNumber}>{upcomingTasks.length}</Text>
              <Text style={styles.summaryLabel}>Próximas entregas</Text>
            </View>

            <Lucide name="arrow-up-right" size={20} color={COLORS.soft} />
          </View>
        </View>

        {/* ------------------------------------------
            CALENDARIO: vista mensual
        ------------------------------------------ */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>ORGANIZA TU TIEMPO</Text>
              <Text style={styles.sectionTitle}>CALENDARIO</Text>
            </View>

            {/* Abre el formulario para elegir una fecha manualmente. */}
            <Pressable
              onPress={openDateSelector}
              style={styles.datePickerButton}
            >
              <Lucide name="calendar-days" size={17} color={COLORS.text} />
              <Text style={styles.datePickerButtonText}>ELEGIR FECHA</Text>
            </Pressable>
          </View>

          {/* Navegación entre meses. */}
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() => changeMonth(-1)}
              style={styles.monthArrow}
            >
              <Lucide name="chevron-left" size={25} color={COLORS.text} />
            </Pressable>

            <View style={styles.monthTitleContainer}>
              <Text style={styles.monthText}>
                {MONTHS[visibleMonth.getMonth()]}
              </Text>
              <Text style={styles.monthYear}>
                {visibleMonth.getFullYear()}
              </Text>
            </View>

            <Pressable
              onPress={() => changeMonth(1)}
              style={styles.monthArrow}
            >
              <Lucide name="chevron-right" size={25} color={COLORS.text} />
            </Pressable>
          </View>

          {/* Días de la semana. */}
          <View style={styles.calendarWeekDays}>
            {WEEK_DAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.calendarWeekDay}>
                {day}
              </Text>
            ))}
          </View>

          {/* Días del calendario. */}
          <View style={styles.calendarGrid}>
            {calendarDays.map(item => {
              const isSelected =
                item.dateString === formatDate(selectedDate);

              const isToday = item.dateString === today;

              const hasActivity = tasks.some(
                task =>
                  task.dueDate === item.dateString &&
                  task.status !== 'realizada'
              );

              return (
                <Pressable
                  key={item.dateString}
                  onPress={() => selectCalendarDate(item.date)}
                  style={styles.calendarCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.selectedDay,
                      isToday && !isSelected && styles.todayDay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        !item.isCurrentMonth && styles.outsideDay,
                      ]}
                    >
                      {item.date.getDate()}
                    </Text>
                  </View>

                  {hasActivity ? (
                    <View
                      style={[
                        styles.activityDot,
                        isSelected && styles.selectedActivityDot,
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Leyenda y acceso rápido al día actual. */}
          <View style={styles.calendarFooter}>
            <View style={styles.calendarLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Con actividades</Text>
            </View>

            <Pressable onPress={goToToday} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>VOLVER A HOY</Text>
            </Pressable>
          </View>
        </View>

        {/* ------------------------------------------
            PRÓXIMAS ACTIVIDADES
        ------------------------------------------ */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>LO QUE VIENE</Text>
              <Text style={styles.sectionTitle}>PRÓXIMAS ACTIVIDADES</Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{upcomingTasks.length}</Text>
            </View>
          </View>

          {upcomingTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Lucide
                name="calendar-check"
                size={34}
                color={COLORS.brightWine}
              />
              <Text style={styles.emptyMessage}>
                No tienes próximas actividades.
              </Text>
              <Text style={styles.emptySubmessage}>
                ¡Disfruta el tiempo que tienes libre!
              </Text>
            </View>
          ) : (
            upcomingTasks.slice(0, 3).map((task, index) => (
              <View key={task.id}>
                {renderTaskRow(task, true)}

                {index < Math.min(upcomingTasks.length, 3) - 1 ? (
                  <View style={styles.rowDivider} />
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* ------------------------------------------
            TAREAS DEL DÍA: selector semanal
        ------------------------------------------ */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>TU PLANIFICACIÓN</Text>
              <Text style={styles.sectionTitle}>TAREAS DEL DÍA</Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {selectedDayTasks.length}
              </Text>
            </View>
          </View>

          <Text style={styles.selectedDateLabel}>
            {selectedDate.toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          <View style={styles.weekNavigation}>
            <Pressable
              onPress={() => changeWeek(-1)}
              style={styles.weekArrow}
            >
              <Lucide name="chevron-left" size={23} color={COLORS.text} />
            </Pressable>

            <Text style={styles.weekNavigationLabel}>
              SELECCIONA UN DÍA
            </Text>

            <Pressable
              onPress={() => changeWeek(1)}
              style={styles.weekArrow}
            >
              <Lucide name="chevron-right" size={23} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.weekSelector}>
            {weekDays.map(date => {
              const isSelected =
                formatDate(date) === formatDate(selectedDate);

              const isToday = formatDate(date) === today;

              return (
                <Pressable
                  key={formatDate(date)}
                  onPress={() => selectCalendarDate(date)}
                  style={[
                    styles.weekDayButton,
                    isSelected && styles.selectedWeekDay,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekDayName,
                      isSelected && styles.selectedWeekText,
                    ]}
                  >
                    {WEEK_DAYS[(date.getDay() + 6) % 7]}
                  </Text>

                  <Text
                    style={[
                      styles.weekDayNumber,
                      isSelected && styles.selectedWeekText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>

                  {isToday ? (
                    <View
                      style={[
                        styles.todayIndicator,
                        isSelected && styles.todayIndicatorSelected,
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Actividades del día seleccionado. */}
          <View style={styles.selectedDayTasks}>
            {selectedDayTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Lucide name="coffee" size={32} color={COLORS.brightWine} />
                <Text style={styles.emptyMessage}>
                  No hay tareas para este día.
                </Text>
                <Text style={styles.emptySubmessage}>
                  Puedes aprovechar para adelantar otras actividades.
                </Text>
              </View>
            ) : (
              selectedDayTasks.map(task => (
                <View key={task.id} style={styles.dayTaskRow}>
                  <View style={styles.dayTaskIcon}>
                    <Lucide
                      name={
                        task.type === 'recordatorio'
                          ? 'bell'
                          : task.type === 'nota'
                            ? 'notebook-pen'
                            : 'book-open'
                      }
                      size={21}
                      color={COLORS.brightWine}
                    />
                  </View>

                  <View style={styles.dayTaskInfo}>
                    <Text style={styles.dayTaskTitle}>{task.title}</Text>
                    <Text style={styles.dayTaskTime}>
                      {task.dueTime || 'Sin hora definida'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => completeTask(task.id)}
                    style={styles.dayTaskComplete}
                  >
                    <Lucide
                      name="circle-check"
                      size={25}
                      color={COLORS.brightWine}
                    />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ------------------------------------------
            ACTIVIDADES REALIZADAS
        ------------------------------------------ */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>TUS LOGROS</Text>
              <Text style={styles.sectionTitle}>REALIZADAS</Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{completedCount}</Text>
            </View>
          </View>

          {completedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Lucide
                name="check-circle"
                size={34}
                color={COLORS.brightWine}
              />
              <Text style={styles.emptyMessage}>
                Aún no tienes actividades realizadas.
              </Text>
              <Text style={styles.emptySubmessage}>
                Tus avances aparecerán aquí.
              </Text>
            </View>
          ) : (
            completedTasks.slice(0, 5).map(task => (
              <View key={task.id} style={styles.completedTaskRow}>
                <Lucide
                  name="circle-check"
                  size={24}
                  color={COLORS.brightWine}
                />

                <View style={styles.completedTaskInfo}>
                  <Text style={styles.completedTaskTitle}>{task.title}</Text>

                  <Text style={styles.completedTaskDate}>
                    {task.completedAt
                      ? `Completada · ${formatShortDate(new Date(task.completedAt))}`
                      : 'Actividad realizada'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ------------------------------------------
            PROGRESO: porcentaje de actividades
        ------------------------------------------ */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                MIRA CUÁNTO HAS AVANZADO
              </Text>
              <Text style={styles.sectionTitle}>TU PROGRESO</Text>
            </View>

            <Lucide
              name="trending-up"
              size={25}
              color={COLORS.brightWine}
            />
          </View>

          <View style={styles.progressContent}>
            <View style={styles.progressCircle}>
              <Svg width={150} height={150}>
                <Circle
                  cx="75"
                  cy="75"
                  r="61"
                  stroke={COLORS.darkWine}
                  strokeWidth="13"
                  fill="none"
                />

                <Circle
                  cx="75"
                  cy="75"
                  r="61"
                  stroke={COLORS.brightWine}
                  strokeWidth="13"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 383.27} 383.27`}
                  rotation="-90"
                  origin="75, 75"
                />
              </Svg>

              <View style={styles.progressCenter}>
                <Text style={styles.progressNumber}>{progress}%</Text>
              </View>
            </View>

            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>
                ACTIVIDADES{' \n'}COMPLETADAS
              </Text>

              <Text style={styles.progressDescription}>
                {completedCount} de {totalCount}
              </Text>

              <View style={styles.progressMiniBar}>
                <View
                  style={[
                    styles.progressMiniFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressMessage}>
                {motivationalMessage}
              </Text>
            </View>
          </View>
        </View>

        {/* ------------------------------------------
            CONEXIONES: accesos visuales
        ------------------------------------------ */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>TODO EN UN MISMO LUGAR</Text>
              <Text style={styles.sectionTitle}>CONEXIONES</Text>
            </View>

            <Lucide
              name="external-link"
              size={23}
              color={COLORS.brightWine}
            />
          </View>

          <Text style={styles.connectionDescription}>
            Tus plataformas de estudio en un solo lugar.
          </Text>

          <View style={styles.connectionGrid}>
            {[
              { name: 'Correo', icon: 'mail' as const },
              { name: 'Classroom', icon: 'graduation-cap' as const },
              { name: 'Universidad', icon: 'school' as const },
              { name: 'Teams', icon: 'users' as const },
            ].map(platform => (
              <View key={platform.name} style={styles.connectionItem}>
                <View style={styles.connectionIcon}>
                  <Lucide
                    name={platform.icon}
                    size={23}
                    color={COLORS.brightWine}
                  />
                </View>

                <Text style={styles.connectionText}>{platform.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ------------------------------------------
            MENSAJE FINAL: compañero NOTIU
        ------------------------------------------ */}

        <View style={styles.footerMessage}>
          <Image
            source={require('../../../assets/images/logonotiU.png')}
            style={styles.footerMascot}
            resizeMode="contain"
          />

          <View style={styles.footerTextContainer}>
            <Text style={styles.footerTitle}>UN PASO A LA VEZ.</Text>
            <Text style={styles.footerDescription}>
              {motivationalMessage}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ==================================================
          7. FORMULARIO MODAL: seleccionar fecha manualmente
      ================================================== */}

      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateModal}>
            {/* Encabezado del formulario. */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>PLANIFICACIÓN</Text>
                <Text style={styles.modalTitle}>ELEGIR FECHA</Text>
              </View>

              <Pressable
                onPress={() => setDateModalVisible(false)}
                style={styles.modalClose}
              >
                <Lucide name="x" size={22} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Escribe el año, selecciona el mes y elige el día al que deseas ir.
            </Text>

            {/* Campo para escribir el año. */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>AÑO</Text>

              <TextInput
                value={formYear}
                onChangeText={value =>
                  setFormYear(value.replace(/[^0-9]/g, '').slice(0, 4))
                }
                keyboardType="number-pad"
                placeholder="Ej. 2026"
                placeholderTextColor={COLORS.soft}
                maxLength={4}
                style={styles.formInput}
              />
            </View>

            {/* Selector del mes con flechas. */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>MES</Text>

              <View style={styles.monthPicker}>
                <Pressable
                  style={styles.monthPickerArrow}
                  onPress={() =>
                    setFormMonth(current => (current + 11) % 12)
                  }
                >
                  <Lucide
                    name="chevron-left"
                    size={23}
                    color={COLORS.text}
                  />
                </Pressable>

                <Text style={styles.monthPickerText}>
                  {MONTHS[formMonth]}
                </Text>

                <Pressable
                  style={styles.monthPickerArrow}
                  onPress={() =>
                    setFormMonth(current => (current + 1) % 12)
                  }
                >
                  <Lucide
                    name="chevron-right"
                    size={23}
                    color={COLORS.text}
                  />
                </Pressable>
              </View>
            </View>

            {/* Campo para escribir el día. */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>DÍA</Text>

              <TextInput
                value={formDay}
                onChangeText={value =>
                  setFormDay(value.replace(/[^0-9]/g, '').slice(0, 2))
                }
                keyboardType="number-pad"
                placeholder="Ej. 15"
                placeholderTextColor={COLORS.soft}
                maxLength={2}
                style={styles.formInput}
              />
            </View>

            {/* Botones del formulario. */}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setDateModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </Pressable>

              <Pressable
                onPress={confirmManualDate}
                style={styles.confirmButton}
              >
                <Lucide name="calendar-check" size={19} color={COLORS.white} />
                <Text style={styles.confirmButtonText}>IR A LA FECHA</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          8. NAVEGACIÓN INFERIOR
      ================================================== */}

      <View style={styles.bottomBar}>
        <View style={styles.navItem}>
          <Lucide name="lightbulb" size={24} color={COLORS.text} />
        </View>

        <View style={styles.navItem}>
          <Lucide name="notebook-pen" size={24} color={COLORS.text} />
        </View>

        <View style={styles.activeNavItem}>
          <Lucide name="house" size={26} color={COLORS.white} />
        </View>

        <View style={styles.navItem}>
          <Lucide name="book-open" size={24} color={COLORS.text} />
        </View>

        <View style={styles.navItem}>
          <Lucide name="user-round" size={24} color={COLORS.text} />
        </View>
      </View>
    </View>
  );
}

// ==================================================
// 9. ESTILOS: apariencia visual de cada elemento
// ==================================================

const styles = StyleSheet.create({
  // Fondo general y contenido desplazable.
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 130,
  },

  // Pantalla de carga.
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },

  loadingMascot: {
    width: 130,
    height: 130,
  },

  loadingText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 21,
    color: COLORS.text,
    letterSpacing: 1.2,
  },

  // Encabezado.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 155,
    marginBottom: 28,
  },

  mascot: {
    width: 88,
    height: 115,
  },

  greetingContainer: {
    flex: 1,
    marginLeft: 12,
  },

  date: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: COLORS.muted,
    marginBottom: 7,
    letterSpacing: 0.8,
  },

  greeting: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: COLORS.text,
  },

  userName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 25,
    color: COLORS.brightWine,
    marginTop: -1,
  },

  description: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 7,
    lineHeight: 20,
  },

  headerIcons: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    marginLeft: 5,
  },

  iconButton: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Tarjeta de error.
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 17,
    marginBottom: 20,
    backgroundColor: COLORS.darkWine,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#9C484F',
  },

  errorInfo: {
    flex: 1,
  },

  errorTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 19,
    color: COLORS.white,
  },

  errorDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },

  // Tarjetas de resumen.
  summaryContainer: {
    gap: 13,
    marginBottom: 24,
  },

  summaryCard: {
    minHeight: 96,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 19,
    gap: 17,
  },

  summaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTextContainer: {
    flex: 1,
  },

  summaryNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: COLORS.text,
  },

  summaryLabel: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    color: COLORS.muted,
    marginTop: -2,
  },

  // Tarjetas de las secciones.
  sectionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 19,
    marginBottom: 21,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 19,
    gap: 10,
  },

  sectionEyebrow: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: COLORS.brightWine,
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: COLORS.text,
    letterSpacing: 0.7,
  },

  // Botón para abrir el selector manual.
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },

  datePickerButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  // Encabezado del calendario.
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 21,
    paddingHorizontal: 5,
  },

  monthArrow: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthTitleContainer: {
    alignItems: 'center',
  },

  monthText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 25,
    color: COLORS.text,
    letterSpacing: 1.2,
  },

  monthYear: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: COLORS.muted,
    marginTop: -2,
  },

  // Cuadrícula del calendario.
  calendarWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },

  calendarWeekDay: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: COLORS.muted,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarCell: {
    width: '14.28%',
    height: 53,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedDay: {
    backgroundColor: COLORS.brightWine,
  },

  todayDay: {
    borderWidth: 1,
    borderColor: COLORS.brightWine,
  },

  dayText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    color: COLORS.text,
  },

  selectedDayText: {
    color: COLORS.white,
  },

  outsideDay: {
    color: COLORS.soft,
  },

  activityDot: {
    position: 'absolute',
    bottom: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brightWine,
  },

  selectedActivityDot: {
    backgroundColor: COLORS.white,
  },

  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: COLORS.darkWine,
    paddingTop: 15,
    marginTop: 12,
  },

  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brightWine,
  },

  legendText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: COLORS.muted,
  },

  todayButton: {
    backgroundColor: COLORS.darkWine,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  todayButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 14,
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  // Contadores de actividades.
  countBadge: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 21,
    color: COLORS.text,
  },

  // Filas de actividades.
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 11,
  },

  activityBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  activityInfo: {
    flex: 1,
  },

  activitySubject: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 19,
    color: COLORS.text,
  },

  activityDate: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },

  statusBadge: {
    minWidth: 82,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },

  inProgressBadge: {
    backgroundColor: COLORS.wine,
  },

  pendingBadge: {
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: '#9C484F',
  },

  statusText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 13,
    color: COLORS.text,
  },

  completeButton: {
    padding: 5,
  },

  rowDivider: {
    height: 1,
    backgroundColor: COLORS.darkWine,
  },

  // Mensajes para secciones vacías.
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
    paddingHorizontal: 10,
    gap: 9,
  },

  emptyMessage: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 23,
  },

  emptySubmessage: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Fecha seleccionada y navegación semanal.
  selectedDateLabel: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    color: COLORS.muted,
    textTransform: 'capitalize',
    marginTop: -7,
    marginBottom: 18,
  },

  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  weekArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekNavigationLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: COLORS.muted,
    letterSpacing: 0.8,
  },

  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },

  weekDayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.darkWine,
    minHeight: 76,
  },

  selectedWeekDay: {
    backgroundColor: COLORS.brightWine,
  },

  weekDayName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 13,
    color: COLORS.muted,
  },

  weekDayNumber: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 19,
    color: COLORS.text,
    marginTop: 5,
  },

  selectedWeekText: {
    color: COLORS.white,
  },

  todayIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.brightWine,
    marginTop: 4,
  },

  todayIndicatorSelected: {
    backgroundColor: COLORS.white,
  },

  selectedDayTasks: {
    marginTop: 20,
    gap: 12,
  },

  // Tarjetas de tareas del día.
  dayTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkWine,
    borderRadius: 14,
    padding: 13,
    gap: 12,
  },

  dayTaskIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayTaskInfo: {
    flex: 1,
  },

  dayTaskTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: COLORS.text,
  },

  dayTaskTime: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
  },

  dayTaskComplete: {
    padding: 5,
  },

  // Actividades completadas.
  completedTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.darkWine,
  },

  completedTaskInfo: {
    flex: 1,
  },

  completedTaskTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: COLORS.text,
  },

  completedTaskDate: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
  },

  // Gráfico circular de progreso.
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingVertical: 10,
  },

  progressCircle: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCenter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 35,
    color: COLORS.text,
  },

  progressInfo: {
    flex: 1,
  },

  progressTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: COLORS.text,
    lineHeight: 25,
  },

  progressDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    color: COLORS.text,
    marginTop: 9,
  },

  progressMiniBar: {
    width: '100%',
    height: 8,
    borderRadius: 5,
    backgroundColor: COLORS.darkWine,
    overflow: 'hidden',
    marginTop: 12,
  },

  progressMiniFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.brightWine,
  },

  progressMessage: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 13,
    lineHeight: 20,
  },

  // Conexiones.
  connectionDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
    marginTop: -7,
    marginBottom: 17,
  },

  connectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderColor: COLORS.darkWine,
  },

  connectionItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 5,
    gap: 11,
  },

  connectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectionText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: COLORS.text,
  },

  // Mensaje final del zorro.
  footerMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    gap: 13,
  },

  footerMascot: {
    width: 65,
    height: 65,
  },

  footerTextContainer: {
    flex: 1,
  },

  footerTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 21,
    color: COLORS.brightWine,
    letterSpacing: 0.7,
  },

  footerDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
    marginTop: 3,
  },

  // Fondo oscuro que cubre la pantalla detrás del formulario.
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },

  // Tarjeta del formulario de fecha.
  dateModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalEyebrow: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: COLORS.brightWine,
    letterSpacing: 1,
  },

  modalTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 29,
    color: COLORS.text,
    marginTop: 3,
  },

  modalClose: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
    marginTop: 13,
    marginBottom: 20,
  },

  // Campos del formulario.
  formField: {
    marginBottom: 17,
  },

  formLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  formInput: {
    height: 51,
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    color: COLORS.text,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 17,
  },

  // Selector del mes.
  monthPicker: {
    height: 51,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 9,
  },

  monthPickerArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthPickerText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: COLORS.text,
    letterSpacing: 1,
  },

  // Botones del formulario.
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  cancelButton: {
    flex: 1,
    height: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: COLORS.muted,
  },

  confirmButton: {
    flex: 1.4,
    height: 49,
    borderRadius: 12,
    backgroundColor: COLORS.brightWine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  confirmButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: COLORS.white,
    letterSpacing: 0.4,
  },

  // Barra de navegación inferior.
  bottomBar: {
    position: 'absolute',
    bottom: 19,
    left: 20,
    right: 20,
    height: 69,
    borderRadius: 24,
    backgroundColor: COLORS.wine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 10,
    borderWidth: 1,
    borderColor: '#9A1640',
  },

  navItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavItem: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: COLORS.brightWine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
