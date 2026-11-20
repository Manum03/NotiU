// Ajustes de recordatorios: cuándo avisar antes de cada entrega (hasta 5 tiempos),
// activar o desactivar las push y enviar una notificación de prueba.
import { useState } from 'react';
import { Lucide } from '@react-native-vector-icons/lucide';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { apiRequest } from '../../../services/api/api';
import { colors } from '../../../config/theme';
import { FONTS } from '../../../core/theme/fonts';
import NotiUButton from '../../../shared/components/NotiUButton';
import type { SettingsDto, UpdateSettingsResponse } from '../../../models/settings';

// Tiempos disponibles (minutos antes de la entrega)
const OFFSET_OPTIONS = [
  { minutes: 10080, label: '1 semana' },
  { minutes: 2880, label: '2 días' },
  { minutes: 1440, label: '1 día' },
  { minutes: 360, label: '6 h' },
  { minutes: 120, label: '2 h' },
  { minutes: 60, label: '1 h' },
  { minutes: 30, label: '30 min' },
];

const MAX_OFFSETS = 5;

type Props = {
  settings: SettingsDto;
  onChange: (settings: SettingsDto) => void;
};

export default function ReminderSettings({ settings, onChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // PATCH /settings y actualiza la pantalla con lo que devuelve el backend
  const save = async (body: Partial<SettingsDto>) => {
    try {
      setSaving(true);
      const response = await apiRequest<UpdateSettingsResponse>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      onChange(response.settings);
    } catch (err) {
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleOffset = (minutes: number) => {
    const current = settings.reminders.offsetsMinutes;
    const selected = current.includes(minutes);

    if (!selected && current.length >= MAX_OFFSETS) {
      Alert.alert('Máximo 5 recordatorios', 'Quita uno de los tiempos elegidos para agregar otro.');
      return;
    }

    const offsetsMinutes = selected
      ? current.filter((value) => value !== minutes)
      : [...current, minutes].sort((a, b) => b - a);
    save({ reminders: { offsetsMinutes } });
  };

  const togglePush = (push: boolean) => {
    save({ notifications: { ...settings.notifications, push } });
  };

  const sendTest = async () => {
    try {
      setTesting(true);
      const response = await apiRequest<{ message: string; devices: number }>('/notifications/test', {
        method: 'POST',
      });
      Alert.alert(
        response.devices > 0 ? 'Notificación enviada' : 'No hay dispositivos registrados',
        response.devices > 0
          ? 'Debería llegarte en unos segundos.'
          : 'Abre NotiU en la development build y acepta el permiso de notificaciones.'
      );
    } catch (err) {
      Alert.alert('No se pudo enviar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>RECORDATORIOS</Text>
      <Text style={styles.hint}>
        Elige hasta {MAX_OFFSETS} momentos para que te avisemos antes de cada entrega.
      </Text>

      <View style={styles.chips}>
        {OFFSET_OPTIONS.map((option) => {
          const active = settings.reminders.offsetsMinutes.includes(option.minutes);
          return (
            <Pressable
              key={option.minutes}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleOffset(option.minutes)}
              disabled={saving}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled: saving }}
              accessibilityLabel={`${option.label} antes`}
            >
              {active && <Lucide name="check" size={14} color={colors.white} />}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Notificaciones push</Text>
          <Text style={styles.hint}>Tareas nuevas, cambios de fecha y recordatorios.</Text>
        </View>
        <Switch
          value={settings.notifications.push}
          onValueChange={togglePush}
          disabled={saving}
          trackColor={{ false: colors.surface, true: colors.primaryDark }}
          thumbColor={settings.notifications.push ? colors.primary : colors.muted}
          accessibilityLabel="Notificaciones push"
        />
      </View>

      <NotiUButton
        title="enviar notificación de prueba"
        icon="send"
        variant="outline"
        loading={testing}
        disabled={!settings.notifications.push}
        onPress={sendTest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
    gap: 12,
  },
  cardTitle: {
    fontFamily: FONTS.title,
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTitle: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: colors.text,
  },
});
