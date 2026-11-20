// Entregas pendientes agrupadas por fecha (Hoy, Mañana, Esta semana, Más adelante,
// Sin fecha), con el origen (Moodle/Classroom/NotiU), el curso y el color de urgencia.
import { useMemo, useState } from 'react';
import { Lucide } from '@react-native-vector-icons/lucide';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, urgencyColors } from '../../../config/theme';
import { FONTS } from '../../../core/theme/fonts';
import { SOURCE_LABEL, type TaskDto } from '../../../models/task';
import { formatDue, getUrgency, groupByDue, URGENCY_LABEL } from '../../tasks/utils/taskTiming';

export type DeliveryTask = Pick<
  TaskDto,
  'id' | 'title' | 'status' | 'dueDate' | 'dueTime' | 'dueAt' | 'isOverdue' | 'source' | 'courseName'
>;

type Props = {
  tasks: DeliveryTask[];
  onOpenTask: (taskId: string) => void;
};

// Cuántas se muestran por grupo antes de "Ver más"
const PREVIEW = 3;

export default function DeliveriesSection({ tasks, onOpenTask }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Solo las pendientes (mismo criterio que GET /tasks?status=pendiente)
  const groups = useMemo(
    () => groupByDue(tasks.filter((task) => task.status === 'pendiente')),
    [tasks]
  );
  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0);
  const hidden = groups.reduce((sum, group) => sum + Math.max(0, group.tasks.length - PREVIEW), 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>ENTREGAS</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{total}</Text>
        </View>
      </View>

      {/* Leyenda de colores de urgencia */}
      <View style={styles.legend}>
        {(['alta', 'media', 'baja', 'sinFecha'] as const).map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: urgencyColors[key] }]} />
            <Text style={styles.legendText}>{URGENCY_LABEL[key]}</Text>
          </View>
        ))}
      </View>

      {total === 0 ? (
        <View style={styles.empty}>
          <Lucide name="calendar-check" size={30} color={colors.primary} />
          <Text style={styles.emptyText}>No tienes entregas pendientes.</Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={[styles.groupTitle, group.key === 'vencidas' && { color: urgencyColors.vencida }]}>
              {group.title.toUpperCase()} · {group.tasks.length}
            </Text>

            {(expanded ? group.tasks : group.tasks.slice(0, PREVIEW)).map((task) => {
              const urgency = getUrgency(task);
              const color = urgencyColors[urgency];
              return (
                <Pressable
                  key={task.id}
                  style={styles.row}
                  onPress={() => onOpenTask(task.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title}, urgencia ${URGENCY_LABEL[urgency]}`}
                >
                  <View style={[styles.urgencyBar, { backgroundColor: color }]} />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {task.title}
                    </Text>
                    {task.courseName ? (
                      <Text style={styles.rowCourse} numberOfLines={1}>
                        {task.courseName}
                      </Text>
                    ) : null}
                    <Text style={[styles.rowDate, task.isOverdue && { color: urgencyColors.vencida }]}>
                      {formatDue(task)}
                    </Text>
                  </View>
                  {task.source !== 'MANUAL' && (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceText}>{SOURCE_LABEL[task.source]}</Text>
                    </View>
                  )}
                  <Lucide name="chevron-right" size={18} color={colors.soft} />
                </Pressable>
              );
            })}
          </View>
        ))
      )}

      {hidden > 0 || expanded ? (
        <Pressable style={styles.more} onPress={() => setExpanded((value) => !value)}>
          <Text style={styles.moreText}>{expanded ? 'Ver menos' : `Ver ${hidden} más`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mismo diseño que las tarjetas del Inicio (sectionCard)
  card: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 19,
    marginBottom: 21,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 26,
    color: colors.text,
    letterSpacing: 0.7,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: FONTS.title,
    fontSize: 18,
    color: colors.text,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.muted,
  },
  group: {
    marginTop: 8,
  },
  groupTitle: {
    fontFamily: FONTS.title,
    fontSize: 17,
    color: colors.muted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  urgencyBar: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: colors.text,
  },
  rowCourse: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.muted,
  },
  rowDate: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.soft,
  },
  sourceBadge: {
    backgroundColor: colors.primaryDeep,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: colors.text,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.muted,
  },
  more: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  moreText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: colors.primary,
  },
});
