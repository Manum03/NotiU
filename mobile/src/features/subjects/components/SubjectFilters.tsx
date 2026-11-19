
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  COLORS,
  PRIORITY_LABEL,
  Subject,
  SubjectPriority,
  SubjectStatus,
} from '../types';

export type StatusFilter = 'todas' | SubjectStatus;
export type PriorityFilter = SubjectPriority | null;

type Props = {
  subjects: Subject[];
  status: StatusFilter;
  priority: PriorityFilter;
  onStatusChange: (value: StatusFilter) => void;
  onPriorityChange: (value: PriorityFilter) => void;
  onClear: () => void;
};

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'En curso', value: 'cursando' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Finalizadas', value: 'aprobada' },
];

const PRIORITIES: SubjectPriority[] = [
  'alta',
  'media',
  'baja',
  'sin_fecha',
];
const PRIORITY_TONES: Record<SubjectPriority, string> = {
  alta: '#e0a2b0',
  media: '#ebb68d',
  baja: '#b5d3a3',
  sin_fecha: '#bfa6db',
};

export default function SubjectFilters({
  subjects,
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  onClear,
}: Props) {
  const countFor = (value: StatusFilter) =>
    value === 'todas'
      ? subjects.length
      : subjects.filter(subject => subject.status === value).length;

  const hasActiveFilters = status !== 'todas' || priority !== null;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>FILTRAR MATERIAS</Text>

      <Text style={styles.subtitle}>ESTADO DE LA MATERIA</Text>

      <View style={styles.grid}>
        {STATUS_OPTIONS.map(option => {
          const active = status === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onStatusChange(option.value)}
              style={[
                styles.statusChip,
                active && styles.statusChipActive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  active && styles.activeText,
                ]}
              >
                {option.label}
              </Text>

              <Text
                style={[
                  styles.count,
                  active && styles.activeText,
                ]}
              >
                {countFor(option.value)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.subtitle}>TIPOS DE PRIORIDAD</Text>

      <View style={styles.grid}>
        {PRIORITIES.map(value => {
  const active = priority === value;
  const color = PRIORITY_TONES[value];

  return (
    <Pressable
      key={value}
      onPress={() =>
        onPriorityChange(active ? null : value)
      }
      style={[
        styles.priorityChip,
        {
          borderColor: color,
          backgroundColor: active ? `${color}25` : '#260A13',
        },
      ]}
    >
      <View
        style={[
          styles.priorityDot,
          { backgroundColor: color },
        ]}
      />

      <Text
        style={[
          styles.priorityText,
          { color },
        ]}
      >
        {PRIORITY_LABEL[value]}
      </Text>
    </Pressable>
  );
})}
      </View>

      {hasActiveFilters && (
        <Pressable
          style={styles.clearButton}
          onPress={onClear}
        >
          <Text style={styles.clearText}>LIMPIAR FILTROS</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#1D0A12',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#572033',
    padding: 15,
    marginBottom: 18,
  },

  title: {
    color: COLORS.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 5,
  },

  subtitle: {
    color: COLORS.brightWine,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 14,
    letterSpacing: 0.8,
    marginTop: 13,
    marginBottom: 9,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
  },

  statusChip: {
    width: '48%',
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#310B19',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusChipActive: {
    backgroundColor: '#800427',
    borderColor: '#AA0330',
  },

  statusText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  count: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
  },

  activeText: {
    color: COLORS.white,
  },

  priorityChip: {
    width: '48%',
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#572033',
    backgroundColor: '#260A13',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#AA6680',
  },

  priorityText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#D9C2CC',
    textAlign: 'center',
  },

  clearButton: {
    alignSelf: 'center',
    marginTop: 17,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#800427',
    borderWidth: 1,
    borderColor: '#AA0330',
  },

  clearText: {
    color: COLORS.white,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 14,
    letterSpacing: 1,
  },
});
