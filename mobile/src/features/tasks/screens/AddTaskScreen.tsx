import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { FONTS } from '../../../core/theme/fonts';
import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';
import type { Subject, SubjectsResponse } from '../../subjects/types';
import { COLORS } from '../../subjects/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTask'>;
type TaskType = 'tarea' | 'recordatorio' | 'nota';
type TaskPriority = 'baja' | 'media' | 'alta';

function OptionChip({
  label,
  selected,
  onPress,
  accentColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: accentColor, borderColor: accentColor }]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AddTaskScreen({ navigation, route }: Props) {
  const formMode = route.params?.type ?? 'tarea';
  const taskId = route.params?.taskId;
  const isEditing = Boolean(taskId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtasks, setSubtasks] = useState<
  { id: string; title: string; completed: boolean }[]
>([]);
const [newSubtask, setNewSubtask] = useState('');
  const [type, setType] = useState<TaskType>(
  formMode === 'checklist'
    ? 'tarea'
    : formMode
);
  const paletteCategory =
    formMode === 'checklist'
      ? 'checklist'
      : formMode === 'nota'
        ? 'nota'
        : formMode === 'recordatorio' || type === 'recordatorio'
          ? 'recordatorio'
          : 'tarea';

  const palette = paletteCategory === 'recordatorio'
    ? {
        accent: '#A94B60',
        border: '#783447',
        field: '#211017',
        label: '#DAB4BC',
        placeholder: '#B18A95',
      }
    : paletteCategory === 'nota'
      ? {
          accent: '#C28DA5',
          border: '#80666C',
          field: '#1E1119',
          label: '#D6B9C7',
          placeholder: '#B99AA9',
        }
      : paletteCategory === 'checklist'
        ? {
            accent: '#80666C',
            border: '#572033',
            field: '#170A11',
            label: '#C9B0BE',
            placeholder: '#A98A9A',
          }
        : {
            accent: '#AA0330',
            border: '#800427',
            field: '#1B080F',
            label: '#E9B8C4',
            placeholder: '#C99AA8',
          };

  const [priority, setPriority] = useState<TaskPriority>('media');
  const [status, setStatus] = useState<
  'pendiente' | 'en_curso' | 'realizada'
>('pendiente');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
const [timePickerVisible, setTimePickerVisible] = useState(false);

const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

const [selectedHour, setSelectedHour] = useState('12');
const [selectedMinute, setSelectedMinute] = useState('00');
const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
const [timeMode, setTimeMode] = useState<'hour' | 'minute'>('hour');
const timeModeRef = useRef(timeMode);
useEffect(() => { timeModeRef.current = timeMode; }, [timeMode]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      try {
        const session = await getSession();
        if (!session?.token) return;

        const response = await apiRequest<SubjectsResponse>('/subjects', {
          method: 'GET',
          token: session.token,
        });

        if (active) setSubjects(response.data);
      } catch {
        if (active) {
          Alert.alert('Aviso', 'No se pudieron cargar las materias.');
        }
      } finally {
        if (active) setLoadingSubjects(false);
      }
    }

    loadSubjects();

    return () => {
      active = false;
    };
  }, []);
    useEffect(() => {
    if (!taskId) return;

    let active = true;

    async function loadTask() {
      try {
        setLoadingTask(true);

        const session = await getSession();

        if (!session?.token) {
          throw new Error('No se encontró una sesión activa.');
        }

        const response = await apiRequest<{
          task: {
            title: string;
            description: string;
            status: 'pendiente' | 'en_curso' | 'realizada';
            type: TaskType;
            priority: TaskPriority;
            subjectId: string | null;
            dueDate: string | null;
            dueTime: string | null;
            subtasks: {
              id: string;
              title: string;
              completed: boolean;
            }[];
          };
        }>(`/tasks/${taskId}`, {
          method: 'GET',
          token: session.token,
        });

        if (!active) return;

        const task = response.task;

        setTitle(task.title);
        setDescription(task.description ?? '');
        setType(task.type);
        setPriority(task.priority);
        setSubjectId(task.subjectId);
        setDueDate(task.dueDate ?? '');
        setDueTime(task.dueTime ?? '');
        setSubtasks(task.subtasks ?? []);
        setStatus(task.status);
      } catch (error) {
        if (active) {
          Alert.alert(
            'No se pudo cargar',
            error instanceof Error ? error.message : 'Inténtalo de nuevo.'
          );
        }
      } finally {
        if (active) setLoadingTask(false);
      }
    }

    loadTask();

    return () => {
      active = false;
    };
  }, [taskId]);

  const addSubtask = () => {
  const cleanTitle = newSubtask.trim();

  if (!cleanTitle) return;

  setSubtasks((current) => [
    ...current,
    {
      id: `${Date.now()}-${Math.random()}`,
      title: cleanTitle,
      completed: false,
    },
  ]);

  setNewSubtask('');
};
  const openDatePicker = () => {
    if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      const [year, month] = dueDate.split('-').map(Number);
      setCalendarYear(year);
      setCalendarMonth(month - 1);
    }

    setDatePickerVisible(true);
  };

  const changeCalendarMonth = (amount: number) => {
    const newDate = new Date(calendarYear, calendarMonth + amount, 1);

    setCalendarMonth(newDate.getMonth());
    setCalendarYear(newDate.getFullYear());
  };

  const selectCalendarDate = (day: number) => {
    const formattedDate =
      `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setDueDate(formattedDate);
    setDatePickerVisible(false);
  };

  const openTimePicker = () => {
    if (dueTime && /^\d{2}:\d{2}$/.test(dueTime)) {
      const [hour, minute] = dueTime.split(':').map(Number);
      setSelectedHour(String(hour % 12 || 12).padStart(2, '0'));
      setSelectedMinute(String(minute).padStart(2, '0'));
      setPeriod(hour >= 12 ? 'PM' : 'AM');
    }

    setTimeMode('hour');
    setTimePickerVisible(true);
  };

  const confirmTime = () => {
    let hour24 = Number(selectedHour) % 12;

    if (period === 'PM') {
      hour24 += 12;
    }

    setDueTime(
      `${String(hour24).padStart(2, '0')}:${selectedMinute}`
    );
    setTimePickerVisible(false);
  };
  const updateClockFromTouch = (x: number, y: number) => {
    const center = 130;
    const dx = x - center;
    const dy = y - center;

    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);

    if (timeModeRef.current === 'hour') {
      const index = Math.round(normalizedAngle / (Math.PI / 6)) % 12;
      const hour = index === 0 ? 12 : index;

      setSelectedHour(String(hour).padStart(2, '0'));
    } else {
      // Cada grado representa un minuto: 00 hasta 59.
      const minute = Math.round(
        normalizedAngle / (Math.PI * 2) * 60
      ) % 60;

      setSelectedMinute(String(minute).padStart(2, '0'));
    }
  };

  const clockTouchStart = useRef({ x: 130, y: 130 });

  const clockPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;

        clockTouchStart.current = {
          x: locationX,
          y: locationY,
        };

        updateClockFromTouch(locationX, locationY);
      },

      onPanResponderMove: (_, gestureState) => {
        const x = clockTouchStart.current.x + gestureState.dx;
        const y = clockTouchStart.current.y + gestureState.dy;

        updateClockFromTouch(x, y);
      },
    })
  ).current;
  const saveTask = async () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'Escribe el nombre de la actividad.');
      return;
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD.');
      return;
    }

    if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) {
      Alert.alert('Hora inválida', 'Usa el formato de 24 horas, por ejemplo 14:30.');
      return;
    }

    try {
      setSaving(true);
      const session = await getSession();

      if (!session?.token) {
        throw new Error('No se encontró una sesión activa.');
      }

      await apiRequest(isEditing ? `/tasks/${taskId}` : '/tasks', {
        method: isEditing ? 'PATCH' : 'POST',
        token: session.token,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status,
          subjectId,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          subtasks: subtasks,
        }),
      });

Alert.alert(
  isEditing ? 'Actividad actualizada' : 'Actividad creada',
  isEditing
    ? 'Los cambios se guardaron correctamente.'
    : 'Se guardó correctamente.',
  [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
                <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Lucide name="arrow-left" size={22} color={COLORS.text} />
          </Pressable>

          <View style={styles.headerText}>
  <Text style={[styles.eyebrow, { color: palette.accent }]}>MI LIBRETA</Text>

  <Text style={styles.heading}>
  {isEditing
    ? 'Editar actividad'
    : formMode === 'nota'
      ? 'Nueva nota'
      : formMode === 'recordatorio'
        ? 'Nuevo recordatorio'
        : formMode === 'checklist'
          ? 'Nueva checklist'
          : 'Nueva actividad'}
  </Text>

  <Text style={styles.subtitle}>
    {isEditing
  ? 'Guardar cambios'
  : formMode === 'nota'
    ? 'Guardar nota'
    : formMode === 'recordatorio'
      ? 'Guardar recordatorio'
      : formMode === 'checklist'
        ? 'Guardar checklist'
        : 'Guardar actividad'}
  </Text>
</View>


        </View>

        <View style={[styles.formCard, { borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.label }]}>Información general</Text>

          <Text style={[styles.label, { color: palette.label }]}>
  {formMode === 'nota'
    ? 'Nombre de la nota *'
    : formMode === 'recordatorio'
      ? 'Nombre del recordatorio *'
      : formMode === 'checklist'
        ? 'Nombre de la checklist *'
        : 'Nombre de la actividad *'}
</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={
  formMode === 'nota'
    ? 'Escribe tus ideas y apuntes aquí...'
    : formMode === 'checklist'
      ? 'Agrega una descripción para tu lista...'
      : 'Describe lo que necesitas realizar...'
}
            placeholderTextColor={palette.placeholder}
            style={[styles.input, { borderColor: palette.border, backgroundColor: palette.field }]}
            maxLength={100}
          />

          <Text style={[styles.label, { color: palette.label }]}>
  {formMode === 'nota'
    ? 'Contenido de la nota'
    : formMode === 'checklist'
      ? 'Descripción (opcional)'
      : 'Descripción'}
</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Agrega detalles (opcional)"
            placeholderTextColor={palette.placeholder}
            style={[styles.input, styles.textArea, { borderColor: palette.border, backgroundColor: palette.field }]}
            multiline
            textAlignVertical="top"
          />
                    {formMode === 'checklist' && (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <Text style={[styles.sectionTitle, { color: palette.label }]}>Elementos de mi lista</Text>
              <Text style={styles.helper}>
                Agrega las actividades o pendientes que necesitas completar.
              </Text>

              <View style={styles.newSubtaskRow}>
                <TextInput
                  value={newSubtask}
                  onChangeText={setNewSubtask}
                  placeholder="Escribe un pendiente..."
                  placeholderTextColor={palette.placeholder}
                  style={[styles.subtaskInput, { borderColor: palette.border, backgroundColor: palette.field }]}
                  onSubmitEditing={addSubtask}
                  returnKeyType="done"
                />

                <Pressable
                  style={[styles.addSubtaskButton, { backgroundColor: palette.accent }]}
                  onPress={addSubtask}
                >
                  <Lucide name="plus" size={21} color={COLORS.white} />
                </Pressable>
              </View>

              {subtasks.map((item) => (
  <View key={item.id} style={[styles.subtaskItem, { borderColor: palette.border, backgroundColor: palette.field }]}>
    <Pressable
      onPress={() =>
        setSubtasks((current) =>
          current.map((subtask) =>
            subtask.id === item.id
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          )
        )
      }
    >
      <Lucide
        name={item.completed ? 'circle-check' : 'circle'}
        size={19}
        color={palette.accent}
      />
    </Pressable>

    <TextInput
      value={item.title}
      onChangeText={(value) =>
        setSubtasks((current) =>
          current.map((subtask) =>
            subtask.id === item.id
              ? { ...subtask, title: value }
              : subtask
          )
        )
      }
      placeholder="Nombre del pendiente..."
      placeholderTextColor={palette.placeholder}
      style={[
        styles.subtaskText,
        item.completed && {
          color: COLORS.soft,
          textDecorationLine: 'line-through',
        },
      ]}
    />

    <Pressable
      onPress={() =>
        setSubtasks((current) =>
          current.filter((subtask) => subtask.id !== item.id)
        )
      }
    >
      <Lucide name="trash-2" size={17} color={COLORS.muted} />
    </Pressable>
  </View>
))}
            </>
          )}
          {formMode === 'tarea' && (
  <>
    <Text style={[styles.label, { color: palette.label }]}>Tipo de actividad</Text>

    <View style={styles.optionsRow}>
      <OptionChip accentColor={palette.accent}
        label="Tarea"
        selected={type === 'tarea'}
        onPress={() => setType('tarea')}
      />
      <OptionChip accentColor={palette.accent}
        label="Recordatorio"
        selected={type === 'recordatorio'}
        onPress={() => setType('recordatorio')}
      />
    </View>
  </>
)}


          <Text style={[styles.label, { color: palette.label }]}>Prioridad</Text>
          <View style={styles.optionsRow}>
            <OptionChip accentColor={palette.accent}
              label="Baja"
              selected={priority === 'baja'}
              onPress={() => setPriority('baja')}
            />
            <OptionChip accentColor={palette.accent}
              label="Media"
              selected={priority === 'media'}
              onPress={() => setPriority('media')}
            />
            <OptionChip accentColor={palette.accent}
              label="Alta"
              selected={priority === 'alta'}
              onPress={() => setPriority('alta')}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <Text style={[styles.sectionTitle, { color: palette.label }]}>Materia relacionada</Text>
          <Text style={styles.helper}>
  {formMode === 'nota'
    ? 'Puedes guardar esta nota dentro de una materia o mantenerla personal.'
    : formMode === 'recordatorio'
      ? 'Relaciona este recordatorio con una materia o déjalo independiente.'
      : formMode === 'checklist'
        ? 'Puedes vincular esta lista a una materia o mantenerla independiente.'
        : 'Puedes asociar esta actividad a una materia o dejarla independiente.'}
</Text>

          {loadingSubjects ? (
            <ActivityIndicator color={palette.accent} style={styles.loader} />
          ) : (
            <View style={styles.subjectList}>
              <OptionChip accentColor={palette.accent}
                label="Sin materia"
                selected={subjectId === null}
                onPress={() => setSubjectId(null)}
              />
              {subjects.map((subject) => (
                <OptionChip accentColor={palette.accent}
                  key={subject.id}
                  label={subject.name}
                  selected={subjectId === subject.id}
                  onPress={() => setSubjectId(subject.id)}
                />
              ))}
              {!subjects.length && (
                <Text style={styles.helper}>
                  Todavía no tienes materias registradas.
                </Text>
              )}
            </View>
          )}

            {formMode !== 'nota' && (
  <>
    <View style={[styles.divider, { backgroundColor: palette.border }]} />

    <Text style={[styles.sectionTitle, { color: palette.label }]}>Fecha y hora</Text>
    <Text style={styles.helper}>
      Estos datos son opcionales.
    </Text>

    <Text style={[styles.label, { color: palette.label }]}>
      {formMode === 'recordatorio'
        ? 'Fecha del recordatorio'
        : formMode === 'checklist'
          ? 'Fecha límite'
          : 'Fecha de entrega'}
    </Text>

    <Pressable
      style={styles.pickerField}
      onPress={openDatePicker}
    >
      <Text style={[
        styles.pickerFieldText,
        !dueDate && styles.pickerPlaceholder
      ]}>
        {dueDate || 'Seleccionar fecha'}
      </Text>
      <Lucide name="calendar-days" size={20} color={palette.accent} />
    </Pressable>

    <Text style={[styles.label, { color: palette.label }]}>Hora</Text>

    <Pressable
      style={styles.pickerField}
      onPress={openTimePicker}
    >
      <Text style={[
        styles.pickerFieldText,
        !dueTime && styles.pickerPlaceholder
      ]}>
        {dueTime || 'Seleccionar hora'}
      </Text>
      <Lucide name="clock-3" size={21} color={palette.accent} />
    </Pressable>
  </>
)}


        </View>


                <Modal
          visible={datePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.78)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <View style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: palette.field,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 19,
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 22,
              }}>
                <View>
                  <Text style={{
                    color: palette.accent,
                    fontSize: 10,
                    fontWeight: '900',
                    letterSpacing: 1.5,
                    marginBottom: 5,
                  }}>
                    FECHA
                  </Text>
                  <Text style={{
                    color: COLORS.text,
                    fontSize: 22,
                    fontWeight: '800',
                  }}>
                    Elige un día
                  </Text>
                </View>

                <Pressable onPress={() => setDatePickerVisible(false)}>
                  <Lucide name="x" size={22} color={COLORS.muted} />
                </Pressable>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Pressable
                  onPress={() => changeCalendarMonth(-1)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lucide name="chevron-left" size={21} color={palette.accent} />
                </Pressable>

                <Text style={{
                  color: COLORS.text,
                  fontSize: 16,
                  fontWeight: '800',
                  textTransform: 'capitalize',
                }}>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre',
                    'Diciembre'][calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  onPress={() => changeCalendarMonth(1)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lucide name="chevron-right" size={21} color={palette.accent} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
                  <View
                    key={`weekday-${index}`}
                    style={{
                      width: '14.2857%',
                      height: 34,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      color: COLORS.muted,
                      fontSize: 11,
                      fontWeight: '800',
                    }}>
                      {day}
                    </Text>
                  </View>
                ))}

                {Array.from({ length: 42 }, (_, index) => {
                  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                  const day = index - firstDay + 1;
                  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

                  if (day < 1 || day > daysInMonth) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={{
                          width: '14.2857%',
                          aspectRatio: 1,
                        }}
                      />
                    );
                  }

                  const dateValue =
                    `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                  const selected = dueDate === dateValue;
                  const now = new Date();
                  const isToday =
                    now.getFullYear() === calendarYear &&
                    now.getMonth() === calendarMonth &&
                    now.getDate() === day;

                  return (
                    <Pressable
                      key={`day-${day}`}
                      onPress={() => selectCalendarDate(day)}
                      style={{
                        width: '14.2857%',
                        aspectRatio: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? palette.accent : 'transparent',
                        borderWidth: isToday && !selected ? 1.5 : 0,
                        borderColor: palette.accent,
                      }}>
                        <Text style={{
                          color: selected ? '#18080D' : isToday ? palette.accent : COLORS.text,
                          fontSize: 13,
                          fontWeight: selected || isToday ? '900' : '500',
                        }}>
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 18,
              }}>
                <Pressable onPress={() => setDatePickerVisible(false)}>
                  <Text style={{
                    color: COLORS.muted,
                    fontSize: 11,
                    fontWeight: '800',
                  }}>
                    CANCELAR
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = today.getMonth();
                    const day = today.getDate();

                    setCalendarYear(year);
                    setCalendarMonth(month);
                    setDueDate(
                      `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    );
                    setDatePickerVisible(false);
                  }}
                  style={{
                    backgroundColor: palette.accent,
                    paddingHorizontal: 22,
                    paddingVertical: 11,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{
                    color: '#18080D',
                    fontSize: 11,
                    fontWeight: '900',
                  }}>
                    HOY
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={timePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTimePickerVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.78)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <View style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: palette.field,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 20,
              alignItems: 'center',
            }}>
              <View style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}>
                <View>
                  <Text style={{
                    color: palette.accent,
                    fontSize: 10,
                    fontWeight: '900',
                    letterSpacing: 1.5,
                    marginBottom: 5,
                  }}>
                    HORA
                  </Text>
                  <Text style={{
                    color: COLORS.text,
                    fontSize: 22,
                    fontWeight: '800',
                  }}>
                    Elige la hora
                  </Text>
                </View>

                <Pressable onPress={() => setTimePickerVisible(false)}>
                  <Lucide name="x" size={22} color={COLORS.muted} />
                </Pressable>
              </View>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.background,
                borderRadius: 15,
                padding: 10,
                width: '100%',
                marginBottom: 18,
              }}>
                <Pressable
                  onPress={() => setTimeMode('hour')}
                  style={{
                    minWidth: 65,
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: timeMode === 'hour' ? palette.accent : 'transparent',
                  }}
                >
                  <Text style={{
                    color: timeMode === 'hour' ? '#18080D' : COLORS.text,
                    fontSize: 30,
                    fontWeight: '900',
                  }}>
                    {selectedHour}
                  </Text>
                </Pressable>

                <Text style={{
                  color: palette.accent,
                  fontSize: 27,
                  fontWeight: '900',
                  marginHorizontal: 3,
                }}>
                  :
                </Text>

                <Pressable
                  onPress={() => setTimeMode('minute')}
                  style={{
                    minWidth: 65,
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: timeMode === 'minute' ? palette.accent : 'transparent',
                  }}
                >
                  <Text style={{
                    color: timeMode === 'minute' ? '#18080D' : COLORS.text,
                    fontSize: 30,
                    fontWeight: '900',
                  }}>
                    {selectedMinute}
                  </Text>
                </Pressable>

                <View style={{ marginLeft: 12, gap: 5 }}>
                  {(['AM', 'PM'] as const).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setPeriod(value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: period === value ? palette.accent : 'transparent',
                      }}
                    >
                      <Text style={{
                        color: period === value ? '#18080D' : COLORS.muted,
                        fontSize: 11,
                        fontWeight: '900',
                      }}>
                        {value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text style={{
                color: COLORS.muted,
                fontSize: 11,
                fontWeight: '600',
                marginBottom: 5,
              }}>
                {timeMode === 'hour' ? 'Selecciona la hora' : 'Selecciona los minutos'}
              </Text>

              <View
                style={{
                  width: 260,
                  height: 260,
                  borderRadius: 130,
                  backgroundColor: COLORS.background,
                  borderWidth: 1,
                  borderColor: palette.border,
                  alignSelf: 'center',
                  marginVertical: 12,
                  position: 'relative',
                }}
                {...clockPanResponder.panHandlers}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 260,
                    height: 260,
                    alignItems: 'center',
                    transform: [{
                      rotate: `${(Number(selectedHour) % 12) * 30 + Number(selectedMinute) * 0.5}deg`,
                    }],
                  }}
                >
                  <View style={{
                    marginTop: 82,
                    width: 5,
                    height: 48,
                    borderRadius: 3,
                    backgroundColor: palette.accent,
                  }} />
                </View>

                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 260,
                    height: 260,
                    alignItems: 'center',
                    transform: [{
                      rotate: `${Number(selectedMinute) * 6}deg`,
                    }],
                  }}
                >
                  <View style={{
                    marginTop: 60,
                    width: 3,
                    height: 70,
                    borderRadius: 2,
                    backgroundColor: COLORS.text,
                  }} />
                </View>

                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 126,
                    top: 126,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette.accent,
                    zIndex: 5,
                  }}
                />

                {Array.from({ length: 12 }, (_, index) => {
                  const angle = (index * Math.PI) / 6;
                  const x = 130 + 91 * Math.sin(angle) - 17;
                  const y = 130 - 91 * Math.cos(angle) - 17;
                  const value = timeMode === 'hour'
                    ? (index === 0 ? 12 : index)
                    : index * 5;
                  const label = String(value).padStart(2, '0');
                  const active = timeMode === 'hour'
                    ? Number(selectedHour) === value
                    : Number(selectedMinute) === value;

                  return (
                    <Pressable
                      key={`${timeMode}-${index}`}
                      onPress={() => {
                        if (timeMode === 'hour') {
                          setSelectedHour(label);
                          setTimeMode('minute');
                        } else {
                          setSelectedMinute(label);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? palette.accent : 'transparent',
                      }}
                    >
                      <Text style={{
                        color: active ? '#18080D' : COLORS.text,
                        fontSize: 12,
                        fontWeight: '800',
                      }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{
                color: COLORS.muted,
                fontSize: 10,
                marginTop: 4,
              }}>
                Toca el reloj para ajustar {timeMode === 'hour' ? 'la hora' : 'los minutos'}
              </Text>

              <View style={{
                flexDirection: 'row',
                width: '100%',
                gap: 10,
                marginTop: 19,
              }}>
                <Pressable
                  onPress={() => setTimePickerVisible(false)}
                  style={{
                    flex: 1,
                    padding: 13,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: palette.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: COLORS.muted,
                    fontSize: 11,
                    fontWeight: '800',
                  }}>
                    CANCELAR
                  </Text>
                </Pressable>

                <Pressable
                  onPress={confirmTime}
                  style={{
                    flex: 1,
                    padding: 13,
                    borderRadius: 12,
                    backgroundColor: palette.accent,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: '#18080D',
                    fontSize: 11,
                    fontWeight: '900',
                  }}>
                    CONFIRMAR
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Pressable
          style={[styles.saveButton, { backgroundColor: palette.accent }, saving && styles.disabledButton]}
          onPress={saveTask}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Lucide name="check" size={19} color={COLORS.white} />
              <Text style={styles.saveText}>
  {formMode === 'nota'
    ? 'Guardar nota'
    : formMode === 'recordatorio'
      ? 'Guardar recordatorio'
      : formMode === 'checklist'
        ? 'Guardar checklist'
        : 'Guardar actividad'}
</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 22,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 26,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  
  eyebrow: {
    color: COLORS.brightWine,
    fontFamily: FONTS.title,
    fontSize: 22,
    letterSpacing: 2,
    marginBottom: 5,
  },
  heading: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 32,
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 3,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    marginBottom: 12,
  },
  label: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 17,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerField: {
    minHeight: 49,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerFieldText: {
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  pickerPlaceholder: {
    color: COLORS.soft,
  },  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 22,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    color: COLORS.soft,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  calendarDay: {
    borderRadius: 24,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.brightWine,
  },
  calendarDayText: {
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  clearPickerText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  modalDoneButton: {
    backgroundColor: COLORS.wine,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalDoneText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },  timeDisplay: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: COLORS.background,
    borderRadius: 14,
  },
  timeDisplayText: {
    color: COLORS.brightWine,
    fontFamily: FONTS.title,
    fontSize: 38,
    letterSpacing: 3,
  },
  timeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  timeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  timeTabActive: {
    backgroundColor: COLORS.wine,
  },
  timeTabText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  timeTabTextActive: {
    color: COLORS.white,
  },
  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxHeight: 250,
    overflow: 'scroll',
  },
  timeOption: {
    width: '16.6667%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginVertical: 2,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.brightWine,
  },
  timeOptionText: {
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  timeOptionTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
  },  clockDial: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.background,
    alignSelf: 'center',
    marginVertical: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  clockHand: {
    position: 'absolute',
    width: 2,
    backgroundColor: COLORS.brightWine,
    left: 129,
    bottom: 130,
    transformOrigin: 'bottom',
    borderRadius: 2,
  },
  clockCenter: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.brightWine,
    left: 124,
    top: 124,
    zIndex: 5,
  },
  clockNumber: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockNumberInner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockNumberSelected: {
    backgroundColor: COLORS.brightWine,
  },
  clockNumberText: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  clockNumberTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
  },  digitalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 8,
    marginBottom: 12,
  },
  digitalTimeBox: {
    width: 70,
    height: 62,
    backgroundColor: COLORS.background,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  digitalTimeBoxActive: {
    backgroundColor: COLORS.wine,
    borderColor: COLORS.brightWine,
  },
  digitalTimeText: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 36,
  },
  digitalTimeColon: {
    color: COLORS.text,
    fontSize: 28,
    fontFamily: FONTS.medium,
  },
  periodColumn: {
    gap: 4,
    marginLeft: 2,
  },
  periodButton: {
    width: 38,
    height: 29,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: COLORS.wine,
    borderColor: COLORS.brightWine,
  },
  periodText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  periodTextActive: {
    color: COLORS.white,
  },
  clockInstruction: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },  textArea: {
    minHeight: 90,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 3,
  },
  chipSelected: {
    backgroundColor: COLORS.wine,
    borderColor: COLORS.brightWine,
  },
  chipText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  helper: {
    color: COLORS.soft,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  subjectList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 23,
  },
  loader: {
    marginVertical: 15,
  },
  saveButton: {
    minHeight: 52,
    backgroundColor: COLORS.brightWine,
    borderRadius: 14,
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
    newSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addSubtaskButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.wine,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  subtaskText: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
});














