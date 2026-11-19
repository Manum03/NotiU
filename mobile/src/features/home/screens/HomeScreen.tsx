import HeaderActions from '../../../components/HeaderActions';
import BottomNavigation from '../components/BottomNavigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
//pantalla inicial
import { useCallback, useEffect, useMemo, useState } from 'react';

// iconos
import { Lucide } from '@react-native-vector-icons/lucide';

// circulo de progreso
import Svg, { Circle } from 'react-native-svg';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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


// estados de una actividad
type TaskStatus = 'pendiente' | 'en_curso' | 'realizada';

// tipos de actividaes
type TaskType = 'tarea' | 'recordatorio' | 'nota';

// prioridades
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

// info del usuario
type UserInfo = {
  name?: string;
  username?: string;
  firstName?: string;
  email?: string;
};


// nom meses y en el selector manual de fecha
const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

// dias de la semana empz por lunes
const WEEK_DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// paleta de colores
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


// fecha a formato YYYY-MM-DD, se usa para comparar fechas con back
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// fecha en formato YYYY-MM-DD a date
function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// suma/resta dias a una fecha
function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

// pone el lunes de la semana para iniciar una fecha
function getMonday(date: Date): Date {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

// devuelve fecha corta para mostrar
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

// saludo encabezado segun hora del dia
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return '¡BUENOS DÍAS!';
  if (hour < 19) return '¡BUENAS TARDES!';
  return '¡BUENAS NOCHES!';
}

// mensaje motivacional
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

// obtiene nombre de usuario para mostrar en el encabezado
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



type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {

  // acti y datos de usuario
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);

  // estados para controlar carga/errores
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // fecha seleccionada y mes que se visualiza
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  // semana en la seccion de planificacion
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  // visibilidad del selector manual de fecha
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // controla el menu hambruguesa de meses
  // el calendario principal no usa ese menu hamburguesa
  const [modalMonthMenuVisible, setModalMonthMenuVisible] = useState(false);

  // formulario para seleccionar una fecha manualmente
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()));

  const [formMonth, setFormMonth] = useState(new Date().getMonth());

  const [formDay, setFormDay] = useState(String(new Date().getDate()));

  // mensaje motivacional durante sesion
  // (se pasa la funcion sin parentesis para que se ejecute una sola vez)
  const [motivationalMessage] = useState(getMotivationalMessage);

  //conexion backend

  // recupera acti del usuario desde el endpoint/tasks
  const loadTasks = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      setError('');

      // recupera tokens y datos de la sesion
      const session = await getSession();

      if (!session?.token) {
        throw new Error('No se encontró una sesión activa. Inicia sesión nuevamente.');
      }

      // solicita acti al back
      const response = await apiRequest<TasksResponse>('/tasks', {
        method: 'GET',
        token: session.token,
      });

      // actualiza las acti y la info del usuario
      setTasks(response.tasks ?? []);
      setUser((session.user ?? null) as UserInfo | null);
    } catch (err) {
      // muestra msj si ocurre un problema con la soli
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

  // carga actis cuando se abre la pantalla
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // refresca la pantalla deslizando hacia abajo
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks(false);
  }, [loadTasks]);


  // fecha actual en formato YYYY-MM-DD
  const today = formatDate(new Date());

  // acti que aun no estan realizadas
  const unfinishedTasks = useMemo(
    () => tasks.filter(task => task.status !== 'realizada'),
    [tasks]
  );

  // cantidad de acti pendientes/en curso
  const pendingCount = unfinishedTasks.length;

  // prox acti ordenadas por fecha y hora
  const upcomingTasks = useMemo(() => {
    return unfinishedTasks
      .filter(task => task.dueDate && task.dueDate >= today)
      .sort((a, b) => {
        const dateComparison = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');

        if (dateComparison !== 0) return dateComparison;

        return (a.dueTime ?? '').localeCompare(b.dueTime ?? '');
      });
  }, [unfinishedTasks, today]);

  // actis realizadas ordenadas desde la mas reciente
  const completedTasks = useMemo(
    () =>
      tasks
        .filter(task => task.status === 'realizada')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [tasks]
  );

  // cantidad de actis completadas/totales
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;

  // calcula porcentaje de progreso
  const progress =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  // actis pendientes segun el dia seleccionado
  const selectedDayTasks = useMemo(
    () =>
      tasks
        .filter(
          task =>
            task.dueDate === formatDate(selectedDate) &&
            task.status !== 'realizada'
        )
        .sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? '')),
    [tasks, selectedDate]
  );

//calendario dinamico

  // genera dias del mes visible, incluye los dias de los meses anterior y siguiente
  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;

    // calcula si es 28, 29, 30 o 31 dias
    const daysInMonth = new Date(year, month + 1, 0).getDate();

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

  // genera los 7 dias de la semana para la planificacion
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  // calcula cuantos del dias tiene el mes elegido para el formulario
  // valida lo que es mes de febrero y los años bisiestos
  const formDaysInMonth = useMemo(() => {
    const year = Number(formYear);

    if (!Number.isInteger(year) || year < 1) return 31;

    return new Date(year, formMonth + 1, 0).getDate();
  }, [formYear, formMonth]);


  // cambia el mes visible usando las flechas de los lados
  function changeMonth(direction: number) {
    setVisibleMonth(
      current =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1)
    );
  }

  // selecciona un dia del calendario
  function selectCalendarDate(date: Date) {
    setSelectedDate(date);

    // actualiza el mes visible para mostrar el dia elegido
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));

    // actualiza la semana para la seccion de planificacion
    setWeekStart(getMonday(date));
  }

  // cambia la semana en la seccion de planificacion
  function changeWeek(direction: number) {
    setWeekStart(current => addDays(current, direction * 7));
  }

  // regresa planificacion/calendario a la fecha actual
  function goToToday() {
    const now = new Date();
    setSelectedDate(now);
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setWeekStart(getMonday(now));
  }


  // cajita con la fecha actual
  function openDateSelector() {
    setFormYear(String(selectedDate.getFullYear()));
    setFormMonth(selectedDate.getMonth());
    setFormDay(String(selectedDate.getDate()));
    setModalMonthMenuVisible(false);
    setDateModalVisible(true);
  }

  // valida y confirma la fecha elegida en la cajita
  function confirmManualDate() {
    const year = Number(formYear);
    const day = Number(formDay);

    // comprueba que el año sea valido
    if (
      !Number.isInteger(year) || year < 2000 || year > 2100
    ) {
      Alert.alert('Año no válido', 'Escribe un año entre 2000 y 2100.');
      return;
    }

    // comprueba cuantos dias tiene el mes seleccionado
    const daysInMonth = new Date(year, formMonth + 1, 0).getDate();

    // comprueba que el dia este dentro del rango permitido
    if (
      !Number.isInteger(day) || day < 1 || day > daysInMonth
    ) {
      Alert.alert(
        'Día no válido', `El mes seleccionado tiene ${daysInMonth} días.`
      );
      return;
    }

    // crea la fecha y actualiza el calendario principal
    const newDate = new Date(year, formMonth, day);
    selectCalendarDate(newDate);

    // cierra la cajita y el menu de meses
    setDateModalVisible(false);
    setModalMonthMenuVisible(false);
  }

  // cambia el mes seleccionado en la cajita
  function changeFormMonth(month: number) {
    setFormMonth(month);
    setModalMonthMenuVisible(false);

    // Ajusta el día si el nuevo mes tiene menos días.
    const year = Number(formYear);
    const maxDays = new Date(year, month + 1, 0).getDate();

    if (Number(formDay) > maxDays) {
      setFormDay(String(maxDays));
    }
  }

  // actualiza el año escrito en la cajita
  function changeFormYear(value: string) {
    // permite solo num y un max de 4 caracteres
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    setFormYear(cleanValue);
    const year = Number(cleanValue);

    // ajusta si el dia del año modifica la cantidad de dias del mes
    if (cleanValue.length === 4 && year >= 1) {
      const maxDays = new Date(year, formMonth + 1, 0).getDate();

      if (Number(formDay) > maxDays) {
        setFormDay(String(maxDays));
      }
    }
  }

//completar actividades

  // enmbia soli al back para marcar una acti como realizada
  async function completeTask(taskId: string) {
    try {
      const session = await getSession();

      if (!session?.token) {
        throw new Error('Tu sesión ha expirado.');
      }

      await apiRequest<{ task: Task }>(`/tasks/${taskId}/complete`,
        {
          method: 'PATCH',
          token: session.token,
        }
      );

      // recarga las actis para nmostrar el nuevo estado
      await loadTasks(false);
    } catch (err) {
      Alert.alert(
        'No se pudo actualizar',
        err instanceof Error ? err.message : 'Intenta nuevamente.'
      );
    }
  }

  //fila de actividad

  // construye fila reutilizable para mostrar una acti
  function renderTaskRow(task: Task, showDate = false) {
    const statusLabel = task.status === 'en_curso' ? 'EN CURSO' : 'PENDIENTE';

    return (
      <View key={task.id} style={styles.activityRow}>
        <View
          style={[
            styles.activityBullet,
            {
              backgroundColor:
                task.status === 'en_curso' ? COLORS.brightWine : '#9C484F',
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
            task.status === 'en_curso' ? styles.inProgressBadge : styles.pendingBadge,
          ]}
        >
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        {/* boton para completar la acti */}
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

//pantalla de carga

  //se muestra mientras cargan los datos del back
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

//interfaz principal

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brightWine}
              colors={[COLORS.brightWine]}
            />
          }
        >
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

          <HeaderActions />
          </View>

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

            {/* Total de proximas entregas. */}
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


          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CALENDARIO</Text>

              <Pressable
                onPress={openDateSelector}
                style={styles.datePickerButton}
              >
                <Lucide name="calendar-days" size={17} color={COLORS.text} />
                <Text style={styles.datePickerButtonText}>ELEGIR FECHA</Text>
              </Pressable>
            </View>


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


            <View style={styles.calendarWeekDays}>
              {WEEK_DAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.calendarWeekDay}>
                  {day}
                </Text>
              ))}
            </View>


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


            <View style={styles.calendarFooter}>
              <View style={styles.calendarLegend}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Con actividades</Text>
              </View>

              <Pressable onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>HOY</Text>
              </Pressable>
            </View>
          </View>


          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PRÓXIMAS ACTIVIDADES</Text>

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


          <View style={styles.planningCard}>
            <View style={styles.planningHeader}>
              <View style={styles.planningHeading}>
                <Text style={styles.planningEyebrow}>TU PLANIFICACIÓN</Text>
                <Text style={styles.planningTitle}>TAREAS DEL DÍA</Text>
              </View>

              <View style={styles.planningHeaderRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {selectedDayTasks.length}
                  </Text>
                </View>

                <Pressable
                  onPress={goToToday}
                  style={styles.planningTodayButton}
                >
                  <Lucide
                    name="calendar-check"
                    size={15}
                    color={COLORS.white}
                  />
                  <Text style={styles.planningTodayText}>HOY</Text>
                </Pressable>
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
                const isSelected = formatDate(date) === formatDate(selectedDate);

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
                    {/* icono segun el tipo de acti */}
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

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>REALIZADAS</Text>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{completedCount}</Text>
              </View>
            </View>

            {completedTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Lucide
                  name="circle-check"
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


          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TU PROGRESO</Text>

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

                {/* Barra horizontal de progreso. */}
                <View style={styles.progressMiniBar}>
                  <View
                    style={[styles.progressMiniFill, { width: `${progress}%` }]}
                  />
                </View>

                <Text style={styles.progressMessage}>
                  {motivationalMessage}
                </Text>
              </View>
            </View>
          </View>


          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CONEXIONES</Text>
            </View>

            <Text style={styles.connectionDescription}>
              Tus plataformas de estudio en un solo lugar.
            </Text>

            <View style={styles.connectionGrid}>

              {[
                { name: 'Correo', icon: 'mail' as const },
                { name: 'Classroom', icon: 'graduation-cap' as const },
                { name: 'Universidad / Plataforma', icon: 'school' as const },
                { name: 'Teams', icon: 'users' as const },
              ].map(platform => (
                <Pressable
                  key={platform.name}
                  style={styles.connectionItem}
                  onPress={() =>
                    Alert.alert(
                      platform.name,
                      'La conexión con esta plataforma estará disponible próximamente.'
                    )
                  }
                >
                  <View style={styles.connectionIcon}>
                    <Lucide
                      name={platform.icon}
                      size={23}
                      color={COLORS.brightWine}
                    />
                  </View>

                  <Text style={styles.connectionText}>
                    {platform.name}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                style={[styles.connectionItem, styles.addConnectionItem]}
                onPress={() =>
                  Alert.alert(
                    'Añadir conexión',
                    'Aquí podrás agregar nuevas plataformas próximamente.'
                  )
                }
              >
                <View style={styles.addConnectionIcon}>
                  <Lucide name="plus" size={23} color={COLORS.text} />
                </View>

                <Text style={styles.addConnectionText}>
                  Añadir conexión
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setDateModalVisible(false);
          setModalMonthMenuVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dateModal}>

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>PLANIFICACIÓN</Text>
                  <Text style={styles.modalTitle}>ELEGIR FECHA</Text>
                </View>

                <Pressable
                  onPress={() => {
                    setDateModalVisible(false);
                    setModalMonthMenuVisible(false);
                  }}
                  style={styles.modalClose}
                >
                  <Lucide name="x" size={22} color={COLORS.text} />
                </Pressable>
              </View>

              <Text style={styles.modalDescription}>
                Selecciona el año, el mes y el día al que deseas ir.
              </Text>



              <View style={styles.formField}>
                <Text style={styles.formLabel}>AÑO</Text>

                <TextInput
                  value={formYear}
                  onChangeText={changeFormYear}
                  keyboardType="number-pad"
                  placeholder="Ej. 2026"
                  placeholderTextColor={COLORS.soft}
                  maxLength={4}
                  returnKeyType="done"
                  style={styles.formInput}
                />
              </View>



              <View style={styles.formField}>
                <Text style={styles.formLabel}>MES</Text>

                <Pressable
                  style={styles.modalMonthDropdownButton}
                  onPress={() =>
                    setModalMonthMenuVisible(current => !current)
                  }
                >
                  <Lucide name="menu" size={20} color={COLORS.brightWine} />

                  <Text style={styles.modalMonthDropdownText}>
                    {MONTHS[formMonth]}
                  </Text>

                  <Lucide
                    name={
                      modalMonthMenuVisible ? 'chevron-up' : 'chevron-down'
                    }
                    size={20}
                    color={COLORS.text}
                  />
                </Pressable>

                {/* Lista vertical desplazable con los doce meses. */}
                {modalMonthMenuVisible && (
                  <View style={styles.modalMonthList}>
                    <ScrollView
                      style={styles.modalMonthScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      keyboardShouldPersistTaps="handled"
                    >
                      {MONTHS.map((month, index) => (
                        <Pressable
                          key={month}
                          onPress={() => changeFormMonth(index)}
                          style={[
                            styles.modalMonthItem,
                            formMonth === index && styles.modalMonthItemActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalMonthItemText,
                              formMonth === index && styles.modalMonthItemTextActive,
                            ]}
                          >
                            {month}
                          </Text>

                          {formMonth === index && (
                            <Lucide
                              name="check"
                              size={17}
                              color={COLORS.brightWine}
                            />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>
                  DÍA · {formDaysInMonth} DÍAS EN ESTE MES
                </Text>

                <TextInput
                  value={formDay}
                  onChangeText={value =>
                    setFormDay(value.replace(/[^0-9]/g, '').slice(0, 2))
                  }
                  keyboardType="number-pad"
                  placeholder="Ej. 15"
                  placeholderTextColor={COLORS.soft}
                  maxLength={2}
                  returnKeyType="done"
                  style={styles.formInput}
                />

                <Text style={styles.formHint}>
                  Puedes elegir un día entre 1 y {formDaysInMonth}.
                </Text>
              </View>


              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => {
                    setDateModalVisible(false);
                    setModalMonthMenuVisible(false);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>CANCELAR</Text>
                </Pressable>

                <Pressable
                  onPress={confirmManualDate}
                  style={styles.confirmButton}
                >
                  <Lucide
                    name="calendar-check"
                    size={19}
                    color={COLORS.white}
                  />
                  <Text style={styles.confirmButtonText}>IR A LA FECHA</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNavigation
        activeScreen="Home"
        onHome={() => navigation.navigate('Home')}
        onSubjects={() => navigation.navigate('Subjects')}
        onTasks={() => navigation.navigate('Tasks')}
      />
    </View>
  );
}


// ESTILOS


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 130,
  },


  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },

  loadingMascot: {
    width: 180,
    height: 180,
  },

  loadingText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 21,
    color: COLORS.text,
    letterSpacing: 1.2,
  },

//encabezado

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 155,
    marginBottom: 18,
  },

  mascot: {
    width: 0,
    height: 0,
  },

  greetingContainer: {
    flex: 1,
    marginLeft: 0.5,
  },

  date: {
    fontFamily: 'FONTS.body',
    fontSize: 10,
    color: COLORS.brightWine,
    marginTop: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  greeting: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 42,
    color: COLORS.text,
    marginBottom: -10,
  },

  userName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 33,
    color: COLORS.brightWine,
    marginTop: -1,
    marginBottom: 20,
  },

  description: {
    fontFamily: 'FONTS.body',
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 20,
    lineHeight: 15
  },

//iconos encabezado

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginLeft: 5,
  },

  iconButton: {
    width: 36,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 2,
    transform: [{ translateY: -40 }],
  },

//tarjeta de error

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

//resumen de actividades

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

//tarjetas generales

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

  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: COLORS.text,
    letterSpacing: 0.7,
  },

//boton elegir fecha

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

//encabezado de calendario principal
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 21,
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
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
  },

//dias de la semana del calendario

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

  // punto que indica que hay actividades en ese dia
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

 //pie de calendario con leyenda y boton hoy
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
    backgroundColor: COLORS.brightWine,
    borderRadius: 9,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },

  todayButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: COLORS.white,
    letterSpacing: 0.7,
  },

//contadores

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

//filas de actividades

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

//estados vacios

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

//caja de tu planificacion

  planningCard: {
    backgroundColor: '#2D0A17',
    borderWidth: 1.5,
    borderColor: COLORS.brightWine,
    borderRadius: 22,
    padding: 19,
    marginBottom: 21,
    elevation: 4,
  },

  planningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 17,
  },

  planningHeading: {
    flex: 1,
  },

  planningEyebrow: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: COLORS.brightWine,
    letterSpacing: 1.5,
    marginBottom: 3,
  },

  planningTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 29,
    color: COLORS.text,
    letterSpacing: 0.9,
  },

  planningHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  planningTodayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.brightWine,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
  },

  planningTodayText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  selectedDateLabel: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    color: COLORS.muted,
    textTransform: 'capitalize',
    marginTop: -3,
    marginBottom: 18,
  },

//navegacion de semanas

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

//selector de dias de la semana

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

  //actividades del dia

  selectedDayTasks: {
    marginTop: 20,
    gap: 12,
  },

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

//actividades realizadas

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

//progreso

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

//conexiones

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
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 5,
    gap: 9,
  },

  connectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.darkWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectionText: {
    flex: 1,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    color: COLORS.text,
  },

  addConnectionItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.darkWine,
    width: '100%',
  },

  addConnectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.wine,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addConnectionText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 17,
    color: COLORS.text,
    letterSpacing: 0.4,
  },


  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },

  modalScroll: {
    width: '100%',
    flexGrow: 0,
    maxHeight: '100%',
  },

  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 25,
  },

  dateModal: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#48202D',
    padding: 22,
    elevation: 15,
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

//formulario de fecha

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

  formHint: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: COLORS.soft,
    marginTop: 7,
  },


  // boton que muestra el mes y abre la lista
  modalMonthDropdownButton: {
    height: 51,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
  },

  modalMonthDropdownText: {
    flex: 1,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: COLORS.text,
    letterSpacing: 1,
    marginLeft: 12,
  },

  // contenedor de la lista de meses
  modalMonthList: {
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 7,
    padding: 6,
    maxHeight: 190,
    overflow: 'hidden',
  },

  // scroll interno para poder recorrer los doce meses
  modalMonthScroll: {
    maxHeight: 175,
    flexGrow: 0,
  },

  modalMonthItem: {
    minHeight: 37,
    paddingHorizontal: 11,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalMonthItemActive: {
    backgroundColor: COLORS.card,
  },

  modalMonthItemText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: COLORS.muted,
  },

  modalMonthItemTextActive: {
    color: COLORS.text,
  },

//botones de cancelar y confirmar

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

// barra de navegación inferior
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

  // opciones no seleccionadas
  navItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // opcion correspondiente a la pantalla actual
  activeNavItem: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: COLORS.brightWine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});