
import React, { useEffect, useRef, useState } from 'react';
import {ActivityIndicator, Alert,KeyboardAvoidingView,Modal, PanResponder, Platform,Pressable, ScrollView,StyleSheet,Switch, Text,TextInput,View,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { FONTS } from '../../../core/theme/fonts';
import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';
import {ACTIVITY_LABEL, ActivityType,COLORS, SubjectPriority,formatLongDate, formatTime,} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSubject'>;

type SubjectDetail = {
  id: string;
  name: string;
  teacher: string;
  code: string;
  credits: number;
  semester: number;
  description: string;
  status: 'cursando' | 'pendiente' | 'aprobada';
  priority: SubjectPriority;
  dueDate: string | null;
  dueTime: string | null;
  activityType: ActivityType | null;
  reminder: { enabled: boolean; dateTime?: string };
  notes: string;
  progress: number;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }[];
};

const PRIORITY_OPTIONS: {
  value: SubjectPriority;
  label: string;
}[] = [
  { value: 'alta', label: 'ALTA' },
  { value: 'media', label: 'MEDIA' },
  { value: 'baja', label: 'BAJA' },
  { value: 'sin_fecha', label: 'SIN FECHA' },
];

const PRIORITY_TONES: Record<SubjectPriority, string> = {
  alta: '#E0A2B0',
  media: '#EBB68D',
  baja: '#B5D3A3',
  sin_fecha: '#BFA6DB',
};
const STATUS_TONES = {
  cursando: {
    accent: '#E47D9B',
    background: ['#10060A', '#2B1115', '#35101D'],
    card: '#2B1115',
    border: '#87415A',
  },
  pendiente: {
    accent: '#E5A16F',
    background: ['#10060A', '#2B1115', '#35101D'],
    card: '#260A13',
    border: '#805039',
  },
  aprobada: {
    accent: '#BDA0D4',
    background: ['#10060A', '#2B1115', '#35101D'],
    card: '#35101D',
    border: '#70517F',
  },
} as const;

const ACTIVITY_OPTIONS = Object.keys(
  ACTIVITY_LABEL,
) as ActivityType[];

const REMINDER_OPTIONS = [
  { days: 0, label: 'El mismo dÃ­Â­a' },
  { days: 1, label: 'Un dÃ­Â­a antes' },
  { days: 2, label: 'Dos dÃ­Â­as antes' },
];

// "20261102" -> "2026-11-02"
function maskDate(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);

  if (d.length <= 4) return d;
  if (d.length <= 6) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }

  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

// "2359" -> "23:59"
function maskTime(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 4);

  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

function isValidDate(value: string): boolean {const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!m) return false;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  const date = new Date(y, mo - 1, d);

  return (
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
  );
}

function isValidTime(value: string): boolean {const m = /^(\d{2}):(\d{2})$/.exec(value);

  return (
    !!m &&
    Number(m[1]) <= 23 &&
    Number(m[2]) <= 59
  );
}

// La urgencia se calcula segun la cercania de la entrega
function suggestPriority(dueDate: string,): SubjectPriority {if (!isValidDate(dueDate)) return 'sin_fecha';

  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round(
    (due.getTime() - today.getTime()) / 86400000,
  );

  if (days <= 3) return 'alta';
  if (days <= 7) return 'media';

  return 'baja';
}

function buildReminderDate(
  dueDate: string,
  dueTime: string,
  daysBefore: number,
): string {
  const [y, m, d] = dueDate.split('-').map(Number);

  const [hh, mm] = (isValidTime(dueTime) ? dueTime : '09:00').split(':').map(Number);

  return new Date(y, m - 1, d - daysBefore, hh, mm,).toISOString();}

// Componente reutilizable para las opciones
type ChipProps = {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
};

function Chip({ label, active, color = COLORS.brightWine, onPress }: ChipProps) {
  const hasCustomColor = color !== COLORS.brightWine;

  const borderColor = hasCustomColor
    ? color + (active ? 'FF' : '88')
    : active
      ? color
      : COLORS.border;

  const backgroundColor = active
    ? hasCustomColor ? color : color + '33'
    : hasCustomColor ? color + '12' : 'transparent';

  const textColor = active
    ? hasCustomColor ? '#18080D' : COLORS.white
    : hasCustomColor ? color : COLORS.muted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        {
          borderColor,
          backgroundColor,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        },
      ]}
    >
      {active && (
        <Lucide name="check" size={13} color={hasCustomColor ? '#18080D' : COLORS.white} />
      )}
      <Text style={[styles.chipText, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}
// Pantalla de creacion y edicion de materias
export default function AddSubjectScreen({navigation, route,}: Props) {const [name, setName] = useState('');const [teacher, setTeacher] = useState('');const [code, setCode] = useState(''); const [credits, setCredits] = useState(''); const [semester, setSemester] = useState(''); const [description, setDescription] = useState(''); const [status, setStatus] = useState< 'cursando' | 'pendiente' | 'aprobada'>('cursando');
  
  const statusTheme = STATUS_TONES[status];

  const [priorityChoice, setPriorityChoice] =useState<SubjectPriority | null>(null);

  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const currentDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState(currentDate.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentDate.getFullYear());

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [timeMode, setTimeMode] = useState<'hour' | 'minute'>('hour');

  const timeModeRef = useRef(timeMode);

  useEffect(() => {timeModeRef.current = timeMode;}, [timeMode]);

  const openDatePicker = () => {
    if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      const [year, month] = dueDate.split('-').map(Number);
      setCalendarYear(year);
      setCalendarMonth(month - 1);
    } else {
      const current = new Date();
      setCalendarYear(current.getFullYear());
      setCalendarMonth(current.getMonth());
    }

    setDatePickerVisible(true);
  };

  const changeCalendarMonth = (amount: number) => {const next = new Date(calendarYear, calendarMonth + amount, 1);
    setCalendarMonth(next.getMonth());
    setCalendarYear(next.getFullYear());
  };

  const selectCalendarDate = (day: number) => {
    const value =`${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setDueDate(value);
    setDatePickerVisible(false);
  };

  const openTimePicker = () => {
    if (dueTime && /^\d{2}:\d{2}$/.test(dueTime)) {const [hour, minute] = dueTime.split(':').map(Number);

      setSelectedHour(String(hour % 12 || 12).padStart(2, '0'));
      setSelectedMinute(String(minute).padStart(2, '0'));
      setPeriod(hour >= 12 ? 'PM' : 'AM');
    } else {
      setSelectedHour('12');
      setSelectedMinute('00');
      setPeriod('AM');
    }

    setTimeMode('hour');
    setTimePickerVisible(true);
  };

  const confirmTime = () => {let hour24 = Number(selectedHour) % 12;

    if (period === 'PM') {hour24 += 12;
    }

    setDueTime(`${String(hour24).padStart(2, '0')}:${selectedMinute}`,);
    setTimePickerVisible(false);
  };

  const updateClockFromTouch = (x: number, y: number) => {const center = 130; const dx = x - center;const dy = y - center; const angle = Math.atan2(dy, dx) + Math.PI / 2; const normalized = (angle + Math.PI * 2) % (Math.PI * 2);

    if (timeModeRef.current === 'hour') {
      const index = Math.round(normalized / (Math.PI / 6)) % 12;
      const hour = index === 0 ? 12 : index;

      setSelectedHour(String(hour).padStart(2, '0'));
    } else {
      const minute = Math.round(normalized / (Math.PI * 2) * 60) % 60;

      setSelectedMinute(String(minute).padStart(2, '0'));
    }
  };

  const clockTouchStart = useRef({ x: 130, y: 130 });

  // useState con inicialización perezosa: crea el PanResponder una sola vez sin leer refs durante el render
  // Los callbacks leen refs solo durante el gesto, no en el render (falso positivo de la regla)
  // eslint-disable-next-line react-hooks/refs
  const [clockPanResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        const { locationX, locationY } = event.nativeEvent;
        clockTouchStart.current = { x: locationX, y: locationY };
        updateClockFromTouch(locationX, locationY);
      },
      onPanResponderMove: (_, gestureState) => {
        const x = clockTouchStart.current.x + gestureState.dx;
        const y = clockTouchStart.current.y + gestureState.dy;
        updateClockFromTouch(x, y);
      },
    }),
  );

  const [activityType, setActivityType] = useState<ActivityType | null>(null);

  const [reminderEnabled, setReminderEnabled] = useState(false);

  const [reminderDays, setReminderDays] = useState(1);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [loadingSubject, setLoadingSubject] = useState(false);

  const subjectId = route.params?.subjectId;
  const isEditing = Boolean(subjectId);

  const [originalProgress, setOriginalProgress] = useState(0);

  const [originalSchedule, setOriginalSchedule] = useState<
      {
        day: string;
        startTime: string;
        endTime: string;
        room?: string;
      }[]
    >([]);

  // Cargar los datos de la materia cuando estamos editando
  useEffect(() => {
    if (!subjectId) return;

    let cancelled = false;

    const loadSubject = async () => {
      try {
        setLoadingSubject(true);

        const session = await getSession();

        if (!session?.token) { throw new Error('No se encontrÃ³ una sesiÃ³n activa.',);
        }

        const subject = await apiRequest<SubjectDetail>(`/subjects/${subjectId}`,
          {
            method: 'GET',
            token: session.token,
          },
        );

        if (cancelled) return;

        setName(subject.name);
        setTeacher(subject.teacher);
        setCode(subject.code ?? '');
        setCredits(subject.credits ? String(subject.credits) : '');
        setSemester(subject.semester ? String(subject.semester) : '');
        setDescription(subject.description ?? '');
        setStatus(subject.status);
        setPriorityChoice(subject.priority);
        setDueDate(subject.dueDate ?? '');
        setDueTime(subject.dueTime ?? '');
        setActivityType(subject.activityType);
        setReminderEnabled(subject.reminder.enabled);
        setNotes(subject.notes ?? '');

        setOriginalProgress(subject.progress);
        setOriginalSchedule(subject.schedule ?? []);

        if (
          subject.reminder.dateTime &&
          subject.dueDate
        ) {
          const reminderDate = new Date(subject.reminder.dateTime,);

          const due = new Date(`${subject.dueDate}T00:00:00`,);

          const reminder = new Date(reminderDate.getFullYear(),reminderDate.getMonth(),reminderDate.getDate(),);

          const days = Math.round((due.getTime() - reminder.getTime()) /86400000,);

          setReminderDays(Math.max(0, Math.min(2, days)),);
        }
      } catch (err) {
        if (!cancelled) {
          Alert.alert(
            'No se pudo cargar la materia', err instanceof Error ? err.message: 'Intenta de nuevo.',);
        }
      } finally {
        if (!cancelled) {
          setLoadingSubject(false);
        }
      }
    };

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  // Si no se elige prioridad manualmente, se calcula automaticamente con la fecha
  const priority = priorityChoice ?? suggestPriority(dueDate);

  const validate = (): string | null => {
    if (!name.trim()) {
      return 'Escribe el nombre de la materia.';
    }

    if (credits.trim()) {
      const creditsNumber = Number(credits);

      if (
        !Number.isInteger(creditsNumber) ||
        creditsNumber < 1 ||
        creditsNumber > 10
      ) {
        return 'Los crÃ©ditos deben ser un nÃºmero entero entre 1 y 10.';
      }
    }

    if (semester.trim()) {
      const semesterNumber = Number(semester);

      if (
        !Number.isInteger(semesterNumber) ||
        semesterNumber < 1 ||
        semesterNumber > 12
      ) {
        return 'El semestre debe ser un nÃºmero entero entre 1 y 12.';
      }
    }
    if (dueDate && !isValidDate(dueDate)) {
      return 'La fecha de entrega debe tener el formato AAAA-MM-DD, por ejemplo 2026-11-02.';
    }

    if (dueTime && !dueDate) {
      return 'Para poner una hora lÃ­Â­mite primero indica la fecha de entrega.';
    }

    if (dueTime && !isValidTime(dueTime)) {
      return 'La hora lÃ­mite debe tener el formato HH:MM en 24 horas, por ejemplo 23:59.';
    }

    if (reminderEnabled && !dueDate) {
      return 'Para activar el recordatorio indica la fecha de entrega.';
    }

    return null;
  };

  // Guardar una materia nueva o actualizar una existente
  const handleSave = async () => {
    const problem = validate();

    if (problem) {
      Alert.alert('Revisa el formulario', problem);
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits: credits.trim() ? Number(credits) : 0,
      semester: semester.trim() ? Number(semester) : 0,
      teacher: teacher.trim(),
      status,
      priority,
      description: description.trim(),
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
      activityType,
      reminder: reminderEnabled
        ? {
            enabled: true, dateTime: buildReminderDate( dueDate, dueTime, reminderDays,),
          }
        : { enabled: false },notes: notes.trim(),
    };

    try {
      setSaving(true);

      const session = await getSession();

      if (!session?.token) {
        throw new Error(
          'No se encontrÃ³ una sesiÃ³n activa.',
        );
      }

      if (isEditing && subjectId) {
        await apiRequest<unknown>(`/subjects/${subjectId}`,
          {
            method: 'PATCH', token: session.token,
            
            body: JSON.stringify({...payload, schedule: originalSchedule, progress: originalProgress,}),
          },
        );
      } else {
        await apiRequest<unknown>('/subjects',
          {
            method: 'POST', token: session.token,
            body: JSON.stringify({...payload, color: COLORS.brightWine, schedule: [], progress: 0,}),
          },
        );
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert(
        isEditing ? 'No se pudo actualizar' : 'No se pudo guardar', err instanceof Error ? err.message: 'Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingSubject) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.brightWine}
        />

        <Text style={styles.loadingText}>
          Cargando materia...
        </Text>
      </View>
    );
  }

 return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={
      Platform.OS === 'ios' ? 'padding' : undefined
    }
  >
    <LinearGradient
      colors={[...statusTheme.background]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />

    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

              {/* Tarjeta superior */}
      <View
        style={[
          styles.hero,
          {
            backgroundColor: statusTheme.card,
            borderColor: statusTheme.border,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.back}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <Lucide
            name="chevron-left"
            size={26}
            color={statusTheme.accent}
          />
        </Pressable>

        <View style={styles.heroInputs}>
          <TextInput
            style={styles.nameInput}
            placeholder="NOMBRE DE LA MATERIA"
            placeholderTextColor={COLORS.soft}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={60}
          />

          <TextInput
            style={styles.teacherInput}
            placeholder="Docente o Ã¡rea"
            placeholderTextColor={COLORS.soft}
            value={teacher}
            onChangeText={setTeacher}
            maxLength={60}
          />
        </View>
      </View>

      {/* Código, créditos y semestre */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: statusTheme.background[1],
          borderWidth: 1,
          borderColor: statusTheme.border,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 8,
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 }}>
            <Lucide name="hash" size={13} color={statusTheme.accent} />
            <Text style={[styles.label, { color: statusTheme.accent, fontSize: 9 }]}>CÓDIGO</Text>
          </View>
          <TextInput
            style={[styles.input, {
              backgroundColor: 'transparent',
              borderWidth: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
              height: 32,
              color: COLORS.text,
              fontSize: 13,
            }]}
            placeholder="Ej. MAT101"
            placeholderTextColor={COLORS.soft}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={20}
          />
        </View>

        <View style={{ width: 1, height: 48, backgroundColor: statusTheme.border }} />

        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 }}>
            <Lucide name="book-open" size={13} color={statusTheme.accent} />
            <Text style={[styles.label, { color: statusTheme.accent, fontSize: 9 }]}>CRÉDITOS</Text>
          </View>
          <TextInput
            style={[styles.input, {
              backgroundColor: 'transparent',
              borderWidth: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
              height: 32,
              color: COLORS.text,
              fontSize: 13,
            }]}
            placeholder="0"
            placeholderTextColor={COLORS.soft}
            value={credits}
            onChangeText={setCredits}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        <View style={{ width: 1, height: 48, backgroundColor: statusTheme.border }} />

        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 }}>
            <Lucide name="graduation-cap" size={13} color={statusTheme.accent} />
            <Text style={[styles.label, { color: statusTheme.accent, fontSize: 9 }]}>SEMESTRE</Text>
          </View>
          <TextInput
            style={[styles.input, {
              backgroundColor: 'transparent',
              borderWidth: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
              height: 32,
              color: COLORS.text,
              fontSize: 13,
            }]}
            placeholder="0"
            placeholderTextColor={COLORS.soft}
            value={semester}
            onChangeText={setSemester}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      </View>
      {/* Estado de la materia */}
      <View style={{ marginTop: 8, marginBottom: 12 }}>
        <Text
          style={[
            styles.sectionTitle,
            { color: COLORS.text, marginBottom: 12 },
          ]}
        >
          ESTADO DE LA MATERIA
        </Text>

        <View style={styles.chipsRow}>
          <Chip
            label="CURSANDO"
            color={STATUS_TONES.cursando.accent}
            active={status === 'cursando'}
            onPress={() => setStatus('cursando')}
          />
          <Chip
            label="PENDIENTE"
            color={STATUS_TONES.pendiente.accent}
            active={status === 'pendiente'}
            onPress={() => setStatus('pendiente')}
          />
          <Chip
            label="APROBADA"
            color={STATUS_TONES.aprobada.accent}
            active={status === 'aprobada'}
            onPress={() => setStatus('aprobada')}
          />
        </View>
      </View>


        {/* informacion de la entrega */}
        <Text
          style={[
            styles.sectionTitle,
            { marginTop: 22 },
          ]}
        >
          INFORMACIÃ“N DE LA ENTREGA
        </Text>

<View style={{ marginTop: 14, marginBottom: 18 }}>
        <Text style={[styles.label, { color: statusTheme.accent }]}>
          DESCRIPCIÃ“N (OPCIONAL)
        </Text>
        <TextInput
          style={[
            styles.descriptionInput,
            {
              backgroundColor: statusTheme.card,
              borderColor: statusTheme.border,
            },
          ]}
          placeholder="Describe brevemente esta materia..."
          placeholderTextColor={COLORS.soft}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={300}
        />
      </View>

        <Text style={[styles.label, { color: statusTheme.accent, marginTop: 14 }]}>
          FECHA DE ENTREGA
        </Text>

        <Pressable
          style={[
            styles.pickerField,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: statusTheme.border,
              backgroundColor: statusTheme.card,
            },
          ]}
          onPress={openDatePicker}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar fecha de entrega"
        >
          <Text
            style={{
              color: isValidDate(dueDate) ? COLORS.text : COLORS.soft,
              fontFamily: FONTS.body,
              fontSize: 14,
            }}
          >
            {isValidDate(dueDate) ? formatLongDate(dueDate) : 'Seleccionar fecha'}
          </Text>
          <Lucide name="calendar-days" size={20} color={statusTheme.accent} />
        </Pressable>

        <Text style={[styles.label, { color: statusTheme.accent, marginTop: 14 }]}>
          HORA LÃMITE
        </Text>

        <Pressable
          style={[
            styles.pickerField,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: statusTheme.border,
              backgroundColor: statusTheme.card,
            },
          ]}
          onPress={openTimePicker}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar hora lÃ­mite"
        >
          <Text
            style={{
              color: isValidTime(dueTime) ? COLORS.text : COLORS.soft,
              fontFamily: FONTS.body,
              fontSize: 14,
            }}
          >
            {isValidTime(dueTime) ? formatTime(dueTime) : 'Seleccionar hora'}
          </Text>
          <Lucide name="clock" size={21} color={statusTheme.accent} />
        </Pressable>
        <View style={styles.fieldRow}>
          <Lucide
            name="tag"
            size={18}
            color={statusTheme.accent}
          />

          <View style={styles.fieldBody}>
            <Text style={styles.label}>
              TIPO DE ACTIVIDAD
            </Text>

            <View style={styles.chipsRow}>
              {ACTIVITY_OPTIONS.map(type => (
                <Chip
                  key={type}
                  label={ACTIVITY_LABEL[type]}
                  color={statusTheme.accent}
                  active={activityType === type}
                  onPress={() =>
                    setActivityType(
                      activityType === type
                        ? null
                        : type,
                    )
                  }
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Recordatorio */}
        <View style={styles.reminderHeader}>
          <View style={styles.reminderTitle}>
            <Lucide
              name="bell"
              size={18}
              color={statusTheme.accent}
            />

            <Text style={styles.label}>
              RECORDATORIO
            </Text>
          </View>

          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{
              false: COLORS.border,
              true: statusTheme.accent,
            }}
            thumbColor={
              reminderEnabled ? COLORS.text : COLORS.muted
            }
          />
        </View>

        {reminderEnabled && (
          <View
            style={[
              styles.chipsRow,{ marginTop: 10 },
            ]}
          >
            {REMINDER_OPTIONS.map(o => (
              <Chip
                key={o.days}
                label={o.label}
                color={statusTheme.accent}
                active={reminderDays === o.days}
                onPress={() => setReminderDays(o.days)
                }
              />
            ))}
          </View>
        )}

        {/* Notas */}
        <View
  style={[
    styles.notesBox,
    {
      backgroundColor: statusTheme.card,
      borderColor: statusTheme.border,
      borderWidth: 1,
    },
  ]}
>
          <Text style={styles.label}>
            NOTAS PERSONALES
          </Text>

          <TextInput
            style={styles.notesInput}
            placeholder="Algo que quieras recordar..."
            placeholderTextColor={COLORS.soft}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={300}
          />
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.button,
              styles.buttonMain,
              {
                backgroundColor: statusTheme.accent,
                borderColor: statusTheme.accent,
              },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#18080D" />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                }}
              >
                <Lucide
                  name="check"
                  size={18}
                  color="#18080D"
                />

                <Text style={[styles.buttonText, { color: '#18080D' }]}>
                  {isEditing ? 'GUARDAR CAMBIOS' : 'GUARDAR'}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.buttonGhost,
              {
                borderColor: statusTheme.border,
                backgroundColor: statusTheme.card,
              },
            ]}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Lucide
              name="x"
              size={18}
              color={COLORS.text}
            />

            <Text style={styles.buttonText}>
              CANCELAR
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* CALENDARIO */}
      <Modal
        transparent
        animationType="fade"
        visible={datePickerVisible}
        onRequestClose={() => setDatePickerVisible(false)}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.78)',
            justifyContent: 'center',
            padding: 22,
          }}
        >
          <View
            style={{
              backgroundColor: statusTheme.card,
              borderColor: statusTheme.border,
              borderWidth: 1,
              borderRadius: 22,
              padding: 19,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <View>
                <Text style={{ color: statusTheme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
                  FECHA DE ENTREGA
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                  Elige un dÃ­a
                </Text>
              </View>

              <Pressable
                onPress={() => setDatePickerVisible(false)}
                hitSlop={10}
                style={{ padding: 7 }}
              >
                <Lucide name="x" size={21} color={COLORS.text} />
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Pressable
                onPress={() => changeCalendarMonth(-1)}
                style={{ padding: 9 }}
              >
                <Lucide name="chevron-left" size={21} color={statusTheme.accent} />
              </Pressable>

              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800', textTransform: 'capitalize' }}>
                {new Date(calendarYear, calendarMonth, 1).toLocaleDateString('es-CO', {month: 'long', year: 'numeric',})}
              </Text>

              <Pressable
                onPress={() => changeCalendarMonth(1)}
                style={{ padding: 9 }}
              >
                <Lucide name="chevron-right" size={21} color={statusTheme.accent} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
                <Text
                  key={`${day}-${index}`}
                  style={{
                    width: 36,
                    textAlign: 'center',
                    color: COLORS.muted,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  {day}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Array.from({ length: 42 }, (_, index) => {
                const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                const day = index - firstDay + 1;
                const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

                if (day < 1 || day > daysInMonth) {
                  return <View key={`empty-${index}`} style={{ width: 38, height: 38, margin: 1 }} />;
                }

                const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const selected = dueDate === dateKey;
                const now = new Date();
                const isToday = now.getFullYear() === calendarYear && now.getMonth() === calendarMonth && now.getDate() === day;

                return (
                  <Pressable
                    key={dateKey}
                    onPress={() => selectCalendarDate(day)}
                    style={{
                      width: 38,
                      height: 38,
                      margin: 1,
                      borderRadius: 13,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? statusTheme.accent : 'transparent',
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: selected && isToday ? COLORS.text : statusTheme.accent,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? '#18080D' : isToday ? statusTheme.accent : COLORS.text,
                        fontSize: 13,
                        fontWeight: selected || isToday ? '900' : '500',
                      }}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 19 }}>
              <Pressable
                onPress={() => setDatePickerVisible(false)}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: statusTheme.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '800' }}>
                  CANCELAR
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const now = new Date(); setCalendarYear(now.getFullYear()); setCalendarMonth(now.getMonth()); selectCalendarDate(now.getDate());
                }}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  backgroundColor: statusTheme.accent,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#18080D', fontSize: 11, fontWeight: '900' }}>
                  HOY
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* RELOJ */}
      <Modal
        transparent
        animationType="fade"
        visible={timePickerVisible}
        onRequestClose={() => setTimePickerVisible(false)}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.78)',
            justifyContent: 'center',
            padding: 22,
          }}
        >
          <View
            style={{
              backgroundColor: statusTheme.card,
              borderColor: statusTheme.border,
              borderWidth: 1,
              borderRadius: 22,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: statusTheme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
                  HORA LÃMITE
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                  Elige la hora
                </Text>
              </View>

              <Pressable onPress={() => setTimePickerVisible(false)} hitSlop={10} style={{ padding: 7 }}>
                <Lucide name="x" size={21} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, marginBottom: 17 }}>
              <Pressable
                onPress={() => setTimeMode('hour')}
                style={{
                  backgroundColor: timeMode === 'hour' ? statusTheme.accent : '#1B0B11',
                  borderRadius: 12,
                  paddingHorizontal: 17,
                  paddingVertical: 11,
                }}
              >
                <Text style={{ color: timeMode === 'hour' ? '#18080D' : COLORS.text, fontSize: 25, fontWeight: '900' }}>
                  {selectedHour}
                </Text>
              </Pressable>

              <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '900' }}>:</Text>

              <Pressable
                onPress={() => setTimeMode('minute')}
                style={{
                  backgroundColor: timeMode === 'minute' ? statusTheme.accent : '#1B0B11',
                  borderRadius: 12,
                  paddingHorizontal: 17,
                  paddingVertical: 11,
                }}
              >
                <Text style={{ color: timeMode === 'minute' ? '#18080D' : COLORS.text, fontSize: 25, fontWeight: '900' }}>
                  {selectedMinute}
                </Text>
              </Pressable>

              <View style={{ gap: 6, marginLeft: 4 }}>
                {(['AM', 'PM'] as const).map(value => (
                  <Pressable
                    key={value}
                    onPress={() => setPeriod(value)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: period === value ? statusTheme.accent : '#1B0B11',
                    }}
                  >
                    <Text style={{ color: period === value ? '#18080D' : COLORS.muted, fontSize: 10, fontWeight: '900' }}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View
              {...clockPanResponder.panHandlers}
              style={{
                width: 260,
                height: 260,
                borderRadius: 130,
                backgroundColor: '#1B0B11',
                borderWidth: 1,
                borderColor: statusTheme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Aguja de la hora */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 260,
                  height: 260,
                  transform: [{ rotate: `${((Number(selectedHour) % 12) * 30) + (Number(selectedMinute) * 0.5)}deg` }],
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 82,
                    alignSelf: 'center',
                    width: 5,
                    height: 48,
                    borderRadius: 3,
                    backgroundColor: statusTheme.accent,
                  }}
                />
              </View>

              {/* Aguja de los minutos */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 260,
                  height: 260,
                  transform: [{ rotate: `${Number(selectedMinute) * 6}deg` }],
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 60,
                    alignSelf: 'center',
                    width: 3,
                    height: 70,
                    borderRadius: 2,
                    backgroundColor: COLORS.text,
                  }}
                />
              </View>

              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusTheme.accent }} />

              {Array.from({ length: 12 }, (_, index) => {
                const angle = (index * Math.PI) / 6;
                const x = 130 + 91 * Math.sin(angle) - 17;
                const y = 130 - 91 * Math.cos(angle) - 17;
                const value = timeMode === 'hour' ? (index === 0 ? 12 : index) : index * 5;
                const label = String(value).padStart(2, '0');
                const active = timeMode === 'hour' ? Number(selectedHour) === value : Number(selectedMinute) === value;

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
                      backgroundColor: active ? statusTheme.accent : 'transparent',
                    }}
                  >
                    <Text style={{ color: active ? '#18080D' : COLORS.text, fontSize: 12, fontWeight: '800' }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 12 }}>
              Toca el reloj para ajustar {timeMode === 'hour' ? 'la hora' : 'los minutos'}
            </Text>

            <View style={{ flexDirection: 'row', width: '100%', gap: 10, marginTop: 19 }}>
              <Pressable
                onPress={() => setTimePickerVisible(false)}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: statusTheme.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '800' }}>
                  CANCELAR
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmTime}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 12,
                  backgroundColor: statusTheme.accent,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#18080D', fontSize: 11, fontWeight: '900' }}>
                  CONFIRMAR
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    backgroundColor: '#310B19',
    marginBottom: 18,
  },

  back: {
    width: 24,
    alignItems: 'center',
  },

  heroInputs: {
    flex: 1,
  },

  nameInput: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 22,
    fontWeight: '900',
    padding: 0,
    minHeight: 34,
  },

  teacherInput: {
    color: COLORS.muted,
    fontSize: 12,
    padding: 0,
    marginTop: 4,
  },

  descriptionCard: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  descriptionInput: {
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
    minHeight: 76,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 2,
  },

  row3: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  miniField: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    padding: 10,
  },

  label: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 7,
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

  input: {
    color: COLORS.text,
    backgroundColor: COLORS.darkWine,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 12,
  },

  inputMulti: {
    minHeight: 85,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.darkWine,
  },

  chipText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },

  hint: {
    color: COLORS.soft,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
    marginBottom: 10,
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },

  fieldBody: {
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },

  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  reminderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  notesBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  notesInput: {
    color: COLORS.text,
    fontSize: 12,
    minHeight: 75,
    textAlignVertical: 'top',
    padding: 8,
  },

  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 28,
    paddingHorizontal: 2,
  },

  button: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  buttonMain: {
    backgroundColor: COLORS.wine,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
  },

  buttonGhost: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  buttonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

