
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lucide } from '@react-native-vector-icons/lucide';

import { FONTS } from '../../../core/theme/fonts';
import {
  COLORS,
  STATUS_LABEL,
  Subject,
  formatShortDate,
  reminderShortLabel,
} from '../types';

type Props = {
  subject: Subject;
  onPress: () => void;
};

const CARD_GRADIENT = {
  cursando: ['#68132F', '#3B0B20', '#210914'],
  pendiente: ['#75402D', '#49251F', '#260F16'],
  aprobada: ['#59405F', '#38283F', '#1E101F'],
} as const;

const CARD_ACCENT = {
  cursando: '#E47D9B',
  pendiente: '#E5A16F',
  aprobada: '#BDA0D4',
} as const;

export default function SubjectCard({ subject, onPress }: Props) {
  const progress = Math.min(100, Math.max(0, subject.progress ?? 0));
  const accentColor = CARD_ACCENT[subject.status];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${subject.name}`}
      style={styles.card}
    >
      <LinearGradient
        colors={CARD_GRADIENT[subject.status]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Nombre y estado */}
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {subject.name.toUpperCase()}
          </Text>

          <View
            style={[
              styles.pill,
              { backgroundColor: accentColor },
            ]}
          >
            <Text style={styles.pillText}>
              {STATUS_LABEL[subject.status]}
            </Text>
          </View>
        </View>

        {/* Docente */}
        <Text style={styles.teacher} numberOfLines={1}>
          {subject.teacher || 'Docente por asignar'}
        </Text>

        {/* Progreso */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>PROGRESO</Text>
          <Text style={[styles.percent, { color: accentColor }]}>
            {progress}%
          </Text>
        </View>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${progress}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>

        {/* Información adicional */}
        <View style={styles.detailsRow}>
          <View style={styles.detail}>
            <Lucide
              name="bell"
              size={13}
              color={accentColor}
            />
            <Text style={styles.detailText} numberOfLines={1}>
              {reminderShortLabel(subject)}
            </Text>
          </View>

          <View style={styles.detail}>
            <Lucide
              name="calendar"
              size={13}
              color={accentColor}
            />
            <Text style={styles.detailText} numberOfLines={1}>
              {formatShortDate(subject.dueDate)}
            </Text>
          </View>
        </View>

        {/* Indicador de entrada */}
        <View style={styles.arrow}>
          <Lucide
            name="chevron-right"
            size={18}
            color={COLORS.text}
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
card: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 14,
  },

  gradient: {
    padding: 16,
    paddingRight: 35,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  name: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 23,
    letterSpacing: 0.8,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillText: {
    color: '#210914',
    fontFamily: FONTS.title,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  teacher: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 5,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 17,
    marginBottom: 7,
  },

  progressLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.title,
    fontSize: 12,
    letterSpacing: 0.8,
  },

  percent: {
    fontFamily: FONTS.title,
    fontSize: 16,
  },

  track: {
    width: '100%',
    height: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: 10,
  },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },

  detailText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 10,
  },

  arrow: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -9 }],
  },
});
