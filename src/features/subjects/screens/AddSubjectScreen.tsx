import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { FONTS } from '../../../core/theme/fonts';
import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';
import {
  ACTIVITY_LABEL, ActivityType, COLORS, PRIORITY_COLOR, SubjectPriority,
  formatLongDate, formatTime,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSubject'>;

const PRIORITY_OPTIONS: { value: SubjectPriority; label: string }[] = [
  { value: 'alta', label: 'ALTA' },
  { value: 'media', label: 'MEDIA' },
  { value: 'baja', label: 'BAJA' },
  { value: 'sin_fecha', label: 'SIN FECHA' },
];

const ACTIVITY_OPTIONS = Object.keys(ACTIVITY_LABEL) as ActivityType[];

const REMINDER_OPTIONS = [
  { days: 0, label: 'El mismo día' },
  { days: 1, label: 'Un día antes' },
  { days: 2, label: 'Dos días antes' },
];

/* ---------- Helpers ---------- */

// "20261102" -> "2026-11-02"
function maskDate(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

// "2359" -> "23:59"
function maskTime(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

function isValidDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

function isValidTime(value: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

// La urgencia sale de qué tan cerca está la entrega
function suggestPriority(dueDate: string): SubjectPriority {
  if (!isValidDate(dueDate)) return 'sin_fecha';
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days <= 3) return 'alta';
  if (days <= 7) return 'media';
  return 'baja';
}

function buildReminderDate(dueDate: string, dueTime: string, daysBefore: number): string {
  const [y, m, d] = dueDate.split('-').map(Number);
  const [hh, mm] = (isValidTime(dueTime) ? dueTime : '09:00').split(':').map(Number);
  return new Date(y, m - 1, d - daysBefore, hh, mm).toISOString();
}

/* ---------- Chip reutilizable ---------- */

type ChipProps = {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
};

function Chip({ label, active, color = COLORS.brightWine, onPress }: ChipProps) {
  const textColor = color === COLORS.brightWine ? COLORS.white : color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        { borderColor: active ? color : COLORS.border },
        active && { backgroundColor: color + '33' },
      ]}
    >
      <Text style={[styles.chipText, active && { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Pantalla ---------- */

export default function AddSubjectScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'cursando' | 'pendiente'>('cursando');
  const [priorityChoice, setPriorityChoice] = useState<SubjectPriority | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Si el usuario no eligió prioridad, se calcula con la fecha de entrega
  const priority = priorityChoice ?? suggestPriority(dueDate);

  const validate = (): string | null => {
    if (!name.trim()) return 'Escribe el nombre de la materia.';
    if (!code.trim()) return 'Escribe el código de la materia.';

    const creditsNumber = Number(credits);
    if (!Number.isInteger(creditsNumber) || creditsNumber < 1) {
      return 'Los créditos deben ser un número entero mayor a 0.';
    }

    const semesterNumber = Number(semester);
    if (!Number.isInteger(semesterNumber) || semesterNumber < 1) {
      return 'El semestre debe ser un número entero mayor a 0.';
    }

    if (dueDate && !isValidDate(dueDate)) {
      return 'La fecha de entrega debe tener el formato AAAA-MM-DD, por ejemplo 2026-11-02.';
    }
    if (dueTime && !dueDate) {
      return 'Para poner una hora límite primero indica la fecha de entrega.';
    }
    if (dueTime && !isValidTime(dueTime)) {
      return 'La hora límite debe tener el formato HH:MM en 24 horas, por ejemplo 23:59.';
    }
    if (reminderEnabled && !dueDate) {
      return 'Para activar el recordatorio indica la fecha de entrega.';
    }
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) {
      Alert.alert('Revisa el formulario', problem);
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits: Number(credits),
      semester: Number(semester),
      teacher: teacher.trim(),
      color: COLORS.brightWine,
      schedule: [],
      status,
      priority,
      description: description.trim(),
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
      activityType,
      reminder: reminderEnabled
        ? { enabled: true, dateTime: buildReminderDate(dueDate, dueTime, reminderDays) }
        : { enabled: false },
      notes: notes.trim(),
      progress: 0,
    };

    try {
      setSaving(true);
      const session = await getSession();
      if (!session?.token) throw new Error('No se encontró una sesión activa.');

      await apiRequest<unknown>('/subjects', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify(payload),
      });

      // La lista se recarga sola al volver
      navigation.goBack();
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta superior */}
        <View style={styles.hero}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.back}
            hitSlop={8}
            accessibilityLabel="Volver"
          >
            <Lucide name="chevron-left" size={26} color={COLORS.brightWine} />
          </Pressable>

          <View style={styles.iconBox}>
            <Lucide name="code" size={28} color={COLORS.text} />
          </View>

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
              placeholder="Docente o área"
              placeholderTextColor={COLORS.soft}
              value={teacher}
              onChangeText={setTeacher}
              maxLength={60}
            />
          </View>
        </View>

        {/* Código, créditos y semestre */}
        <View style={styles.row3}>
          <View style={[styles.miniField, { flex: 1.5 }]}>
            <Text style={styles.label}>CÓDIGO</Text>
            <TextInput
              style={styles.input}
              placeholder="ISC-101"
              placeholderTextColor={COLORS.soft}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={15}
            />
          </View>
          <View style={styles.miniField}>
            <Text style={styles.label}>CRÉDITOS</Text>
            <TextInput
              style={styles.input}
              placeholder="3"
              placeholderTextColor={COLORS.soft}
              value={credits}
              onChangeText={t => setCredits(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.miniField}>
            <Text style={styles.label}>SEMESTRE</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={COLORS.soft}
              value={semester}
              onChangeText={t => setSemester(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        {/* Descripción */}
        <Text style={styles.sectionTitle}>DESCRIPCIÓN</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="¿De qué trata la materia o la actividad?"
          placeholderTextColor={COLORS.soft}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={300}
        />

        {/* Estado y prioridad */}
        <Text style={styles.sectionTitle}>ESTADO Y PRIORIDAD</Text>
        <View style={styles.chipsRow}>
          <Chip label="EN CURSO" active={status === 'cursando'} onPress={() => setStatus('cursando')} />
          <Chip label="PENDIENTE" active={status === 'pendiente'} onPress={() => setStatus('pendiente')} />
        </View>

        <View style={[styles.chipsRow, { marginTop: 10 }]}>
          {PRIORITY_OPTIONS.map(p => (
            <Chip
              key={p.value}
              label={p.label}
              color={PRIORITY_COLOR[p.value]}
              active={priority === p.value}
              onPress={() => setPriorityChoice(priorityChoice === p.value ? null : p.value)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          {priorityChoice === null
            ? 'La prioridad se calcula sola según la fecha de entrega. Toca una para elegirla tú.'
            : 'Prioridad elegida por ti. Tócala otra vez para volver a la automática.'}
        </Text>

        {/* Información de la entrega */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>INFORMACIÓN DE LA ENTREGA</Text>

        <View style={styles.fieldRow}>
          <Lucide name="calendar" size={18} color={COLORS.brightWine} />
          <View style={styles.fieldBody}>
            <Text style={styles.label}>FECHA DE ENTREGA</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={COLORS.soft}
              value={dueDate}
              onChangeText={t => setDueDate(maskDate(t))}
              keyboardType="number-pad"
              maxLength={10}
            />
            <Text style={styles.hint}>
              {isValidDate(dueDate) ? formatLongDate(dueDate) : 'Escribe solo los números, ej. 20261102'}
            </Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Lucide name="clock" size={18} color={COLORS.brightWine} />
          <View style={styles.fieldBody}>
            <Text style={styles.label}>HORA LÍMITE</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.soft}
              value={dueTime}
              onChangeText={t => setDueTime(maskTime(t))}
              keyboardType="number-pad"
              maxLength={5}
            />
            <Text style={styles.hint}>
              {isValidTime(dueTime) ? formatTime(dueTime) : 'Formato de 24 horas, ej. 2359'}
            </Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Lucide name="tag" size={18} color={COLORS.brightWine} />
          <View style={styles.fieldBody}>
            <Text style={styles.label}>TIPO DE ACTIVIDAD</Text>
            <View style={styles.chipsRow}>
              {ACTIVITY_OPTIONS.map(type => (
                <Chip
                  key={type}
                  label={ACTIVITY_LABEL[type]}
                  active={activityType === type}
                  onPress={() => setActivityType(activityType === type ? null : type)}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Recordatorio */}
        <View style={styles.reminderHeader}>
          <View style={styles.reminderTitle}>
            <Lucide name="bell" size={18} color={COLORS.brightWine} />
            <Text style={styles.label}>RECORDATORIO</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.wine }}
            thumbColor={reminderEnabled ? COLORS.brightWine : COLORS.muted}
          />
        </View>

        {reminderEnabled && (
          <View style={[styles.chipsRow, { marginTop: 10 }]}>
            {REMINDER_OPTIONS.map(o => (
              <Chip
                key={o.days}
                label={o.label}
                active={reminderDays === o.days}
                onPress={() => setReminderDays(o.days)}
              />
            ))}
          </View>
        )}

        {/* Notas */}
        <View style={styles.notesBox}>
          <Text style={styles.label}>NOTAS PERSONALES</Text>
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
            style={[styles.button, styles.buttonMain]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Lucide name="check" size={18} color={COLORS.white} />
                <Text style={styles.buttonText}>GUARDAR</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonGhost]}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Lucide name="x" size={18} color={COLORS.text} />
            <Text style={styles.buttonText}>CANCELAR</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },

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
  back: { width: 24, alignItems: 'center' },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInputs: { flex: 1 },
  nameInput: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 22,
    padding: 0,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  teacherInput: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    padding: 0,
    paddingTop: 6,
  },

  row3: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  miniField: { flex: 1 },

  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 22,
    marginBottom: 8,
  },
  label: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 15,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hint: {
    color: COLORS.soft,
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },

  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  inputMulti: {
    minHeight: 84,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.darkWine,
  },
  chipText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },

  fieldRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  fieldBody: { flex: 1 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 22 },

  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  notesBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  notesInput: {
    minHeight: 60,
    padding: 0,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
    textAlignVertical: 'top',
  },

  actions: { flexDirection: 'row', gap: 12, marginTop: 26 },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonMain: { backgroundColor: COLORS.wine, borderWidth: 1, borderColor: COLORS.brightWine },
  buttonGhost: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  buttonText: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 17,
    letterSpacing: 1,
  },
});