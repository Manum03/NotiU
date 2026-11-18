import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import HeaderActions from '../../../components/HeaderActions';

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
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AddTaskScreen({ navigation, route }: Props) {
  const formMode = route.params?.type ?? 'tarea';
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
  const [priority, setPriority] = useState<TaskPriority>('media');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [saving, setSaving] = useState(false);

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

      await apiRequest('/tasks', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          subjectId,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          subtasks: formMode === 'checklist' ? subtasks : [],
        }),
      });

      Alert.alert('Actividad creada', 'Se guardó correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
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
  <Text style={styles.eyebrow}>MI LIBRETA</Text>

  <Text style={styles.heading}>
    {formMode === 'nota'
      ? 'Nueva nota'
      : formMode === 'recordatorio'
        ? 'Nuevo recordatorio'
        : formMode === 'checklist'
          ? 'Nueva checklist'
          : 'Nueva actividad'}
  </Text>

  <Text style={styles.subtitle}>
    {formMode === 'nota'
      ? 'Guarda tus ideas y apuntes.'
      : formMode === 'recordatorio'
        ? 'No olvides tus próximas actividades.'
        : formMode === 'checklist'
          ? 'Organiza tus pendientes paso a paso.'
          : 'Registra algo que necesitas realizar.'}
  </Text>
</View>

          <HeaderActions />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información general</Text>

          <Text style={styles.label}>
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
            placeholderTextColor={COLORS.soft}
            style={styles.input}
            maxLength={100}
          />

          <Text style={styles.label}>
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
            placeholderTextColor={COLORS.soft}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
          />
                    {formMode === 'checklist' && (
            <>
              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Elementos de mi lista</Text>
              <Text style={styles.helper}>
                Agrega las actividades o pendientes que necesitas completar.
              </Text>

              <View style={styles.newSubtaskRow}>
                <TextInput
                  value={newSubtask}
                  onChangeText={setNewSubtask}
                  placeholder="Escribe un pendiente..."
                  placeholderTextColor={COLORS.soft}
                  style={styles.subtaskInput}
                  onSubmitEditing={addSubtask}
                  returnKeyType="done"
                />

                <Pressable
                  style={styles.addSubtaskButton}
                  onPress={addSubtask}
                >
                  <Lucide name="plus" size={21} color={COLORS.white} />
                </Pressable>
              </View>

              {subtasks.map((item) => (
                <View key={item.id} style={styles.subtaskItem}>
                  <Lucide
                    name="circle"
                    size={17}
                    color={COLORS.brightWine}
                  />
                  <Text style={styles.subtaskText}>{item.title}</Text>

                  <Pressable
                    onPress={() =>
                      setSubtasks((current) =>
                        current.filter((subtask) => subtask.id !== item.id)
                      )
                    }
                  >
                    <Lucide name="x" size={18} color={COLORS.muted} />
                  </Pressable>
                </View>
              ))}
            </>
          )}
          {formMode === 'tarea' && (
  <>
    <Text style={styles.label}>Tipo de actividad</Text>

    <View style={styles.optionsRow}>
      <OptionChip
        label="Tarea"
        selected={type === 'tarea'}
        onPress={() => setType('tarea')}
      />
      <OptionChip
        label="Recordatorio"
        selected={type === 'recordatorio'}
        onPress={() => setType('recordatorio')}
      />
    </View>
  </>
)}
          <View style={styles.optionsRow}>
            <OptionChip
              label="Tarea"
              selected={type === 'tarea'}
              onPress={() => setType('tarea')}
            />
            <OptionChip
              label="Recordatorio"
              selected={type === 'recordatorio'}
              onPress={() => setType('recordatorio')}
            />
          </View>

          {formMode !== 'nota' && (
          <>
            </>
)}
          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.optionsRow}>
            <OptionChip
              label="Baja"
              selected={priority === 'baja'}
              onPress={() => setPriority('baja')}
            />
            <OptionChip
              label="Media"
              selected={priority === 'media'}
              onPress={() => setPriority('media')}
            />
            <OptionChip
              label="Alta"
              selected={priority === 'alta'}
              onPress={() => setPriority('alta')}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Materia relacionada</Text>
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
            <ActivityIndicator color={COLORS.brightWine} style={styles.loader} />
          ) : (
            <View style={styles.subjectList}>
              <OptionChip
                label="Sin materia"
                selected={subjectId === null}
                onPress={() => setSubjectId(null)}
              />
              {subjects.map((subject) => (
                <OptionChip
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
              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Fecha y hora</Text>
              <Text style={styles.helper}>
                Estos datos son opcionales.
              </Text>

              <Text style={styles.label}>
                {formMode === 'recordatorio'
                  ? 'Fecha del recordatorio'
                  : formMode === 'checklist'
                    ? 'Fecha límite'
                    : 'Fecha de entrega'}
              </Text>

              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.soft}
                style={styles.input}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

              <Text style={styles.label}>Hora</Text>
              <TextInput
                value={dueTime}
                onChangeText={setDueTime}
                placeholder="HH:MM (ej. 14:30)"
                placeholderTextColor={COLORS.soft}
                style={styles.input}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </>
          )}

        </View>


        <Pressable
          style={[styles.saveButton, saving && styles.disabledButton]}
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
  textArea: {
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


