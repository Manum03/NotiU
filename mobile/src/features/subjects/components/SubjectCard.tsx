
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lucide } from '@react-native-vector-icons/lucide';

import { FONTS } from '../../../core/theme/fonts';
import {
  COLORS,
  STATUS_COLOR,
  STATUS_LABEL,
  Subject,
  formatShortDate,
  reminderShortLabel,
} from '../types';

type Props = {
  subject: Subject;
  onPress: () => void;
};

export default function SubjectCard({ subject, onPress }: Props) {
  const done = subject.status === 'aprobada';
  const progress = Math.min(100, Math.max(0, subject.progress ?? 0));
  const statusColor = STATUS_COLOR[subject.status];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${subject.name}`}
      style={[
        styles.card,
        subject.status === 'cursando' && styles.cardActive,
        subject.status === 'pendiente' && styles.cardPending,
        done && styles.cardDone,
      ]}
    >
      {/* Nombre y estado */}
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={1}>
          {subject.name.toUpperCase()}
        </Text>

        <View style={[styles.pill, { backgroundColor: statusColor }]}>
          <Text
            style={[
              styles.pillText,
              done && { color: COLORS.background },
            ]}
          >
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
        <Text style={styles.percent}>{progress}%</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress}%`,
              backgroundColor: statusColor,
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
            color={COLORS.brightWine}
          />
          <Text style={styles.detailText} numberOfLines={1}>
            {reminderShortLabel(subject)}
          </Text>
        </View>

        <View style={styles.detail}>
          <Lucide
            name="calendar"
            size={13}
            color={COLORS.brightWine}
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
          color={COLORS.muted}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 16,
    paddingRight: 35,
    marginBottom: 14,
  },

  cardActive: {
    backgroundColor: '#310B19',
    borderColor: COLORS.brightWine,
  },

  cardPending: {
    backgroundColor: '#481D2B',
  },

  cardDone: {
    backgroundColor: COLORS.cardDone,
    borderColor: '#6B5A5E',
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
    color: COLORS.white,
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
    color: COLORS.text,
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
    borderTopColor: 'rgba(255,255,255,0.08)',
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
  },
});
