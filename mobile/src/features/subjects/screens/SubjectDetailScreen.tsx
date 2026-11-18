import { FONTS } from '../../../core/theme/fonts';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';
import {
  ACTIVITY_LABEL,
  COLORS,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  formatLongDate,
  formatTime,
  SubjectPriority,
} from '../types';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'SubjectDetail'>;

export default function SubjectDetailScreen({ navigation, route }: Props) {
  const [subject, setSubject] = useState(route.params.subject);
  const [saving, setSaving] = useState(false);
  useFocusEffect(
  useCallback(() => {
    let cancelled = false;

    const loadSubject = async () => {
      try {
        const session = await getSession();
        if (!session?.token) {
          throw new Error('No se encontró una sesión activa.');
        }

        const updatedSubject = await apiRequest<typeof subject>(
          `/subjects/${route.params.subject.id}`,
          {
            method: 'GET',
            token: session.token,
          },
        );

        if (!cancelled) {
          setSubject(updatedSubject);
        }
      } catch (err) {
        if (!cancelled) {
          Alert.alert(
            'No se pudo actualizar la materia',
            err instanceof Error ? err.message : 'Intenta de nuevo.',
          );
        }
      }
    };

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [route.params.subject.id]),
);

  const deleteSubject = async () => {
    try {
      setSaving(true);

      const session = await getSession();
      if (!session?.token) {
        throw new Error('No se encontró una sesión activa.');
      }

      await apiRequest<unknown>(`/subjects/${subject.id}`, {
        method: 'DELETE',
        token: session.token,
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'No se pudo eliminar',
        err instanceof Error ? err.message : 'Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar materia',
      `¿Estás seguro de que deseas eliminar "${subject.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: deleteSubject },
      ],
    );
  };

  const done = subject.status === 'aprobada';
  const PRIORITY_TONES: Record<SubjectPriority, string> = {
  alta: '#E0A2B0',
  media: '#EBB68D',
  baja: '#B5D3A3',
  sin_fecha: '#BFA6DB',
};

const priorityColor = PRIORITY_TONES[subject.priority];

  const completeSubject = async () => {
    try {
      setSaving(true);
      const session = await getSession();
      if (!session?.token) throw new Error('No se encontró una sesión activa.');

      await apiRequest<unknown>(`/subjects/${subject.id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ status: 'aprobada', progress: 100 }),
      });

      setSubject(prev => ({ ...prev, status: 'aprobada', progress: 100 }));
    } catch (err) {
      Alert.alert('No se pudo completar', err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmComplete = () =>
    Alert.alert('Completar materia', `¿Marcar "${subject.name}" como finalizada?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Completar', onPress: completeSubject },
    ]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Volver">
          <Lucide name="chevron-left" size={26} color={COLORS.brightWine} />
        </Pressable>

        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{subject.name.toUpperCase()}</Text>
            <Text style={styles.teacher}>{subject.teacher || 'Docente por asignar'}</Text>
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <View style={[styles.pill, { backgroundColor: STATUS_COLOR[subject.status] }]}>
              <Text style={[styles.pillText, done && { color: COLORS.background }]}>
                {STATUS_LABEL[subject.status]}
              </Text>
            </View>
            <View style={[styles.pill, { borderWidth: 1, borderColor: priorityColor }]}>
              <Text style={[styles.pillText, { color: priorityColor }]}>
                {PRIORITY_LABEL[subject.priority]}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>DESCRIPCIÓN</Text>
        <Text style={styles.body}>{subject.description || 'Sin descripción.'}</Text>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>INFORMACIÓN DE LA ENTREGA</Text>

        <View style={styles.infoRow}>
          <Lucide name="calendar" size={18} color={COLORS.brightWine} />
          <View>
            <Text style={styles.infoLabel}>FECHA DE ENTREGA</Text>
            <Text style={styles.infoValue}>{formatLongDate(subject.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Lucide name="clock" size={18} color={COLORS.brightWine} />
          <View>
            <Text style={styles.infoLabel}>HORA LÍMITE</Text>
            <Text style={styles.infoValue}>{formatTime(subject.dueTime)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Lucide name="tag" size={18} color={COLORS.brightWine} />
          <View>
            <Text style={styles.infoLabel}>TIPO DE ACTIVIDAD</Text>
            <Text style={styles.infoValue}>
              {subject.activityType ? ACTIVITY_LABEL[subject.activityType] : 'Sin definir'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Lucide name="bell" size={18} color={COLORS.brightWine} />
          <View>
            <Text style={styles.infoLabel}>RECORDATORIO</Text>
            <Text style={styles.infoValue}>
              {subject.reminder.enabled ? 'Activado' : 'Desactivado'}
            </Text>
          </View>
        </View>

        <View style={styles.notes}>
          <Text style={styles.infoLabel}>NOTAS PERSONALES</Text>
          <Text style={styles.body}>{subject.notes || 'Sin notas.'}</Text>
        </View>

                <View style={styles.actions}>
          <View style={styles.topActions}>
            <Pressable
              style={[styles.button, styles.buttonGhost]}
              onPress={() => navigation.navigate('AddSubject', { subjectId: subject.id })}
            >
              <Lucide name="pencil" size={18} color={COLORS.text} />
              <Text style={styles.buttonText}>EDITAR</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonDelete]}
              onPress={confirmDelete}
              disabled={saving}
            >
              <Lucide name="trash-2" size={18} color="#FF6B7A" />
              <Text style={[styles.buttonText, { color: '#FF6B7A' }]}>
                ELIMINAR
              </Text>
            </Pressable>
          </View>

          {!done && (
            <Pressable
              style={[styles.button, styles.buttonMain]}
              onPress={confirmComplete}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Lucide name="check" size={18} color={COLORS.white} />
                  <Text style={styles.buttonText}>COMPLETAR</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 22, paddingTop: 56, paddingBottom: 40 },
  back: { width: 40, height: 40, justifyContent: 'center', marginBottom: 8 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.brightWine, backgroundColor: '#310B19', marginBottom: 22,
  },
  name: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  teacher: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { color: COLORS.white, fontSize: 8, fontWeight: '800' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginBottom: 8 },
  body: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  infoLabel: { color: COLORS.text, fontSize: 11, fontWeight: '800', marginBottom: 2 },
  infoValue: { color: COLORS.muted, fontSize: 12 },
  divider: { height: 1, backgroundColor: COLORS.border, marginTop: 20 },
  notes: {
    marginTop: 18, padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
    actions: {
    gap: 12,
    marginTop: 24,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1, height: 50, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buttonMain: { backgroundColor: COLORS.wine, borderWidth: 1, borderColor: COLORS.brightWine },
  buttonGhost: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
    buttonDelete: {
    borderWidth: 1,
    borderColor: '#7A2635',
    backgroundColor: '#2B1115',
  },
  buttonText: { color: COLORS.text, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
});