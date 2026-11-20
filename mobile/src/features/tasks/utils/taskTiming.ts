// Urgencia, agrupación por fecha y formato de las entregas.
import { urgencyColors } from '../../../config/theme';
import type { TaskDto } from '../../../models/task';

export type Urgency = keyof typeof urgencyColors;

const HOUR = 60 * 60 * 1000;

// Urgencia según lo que falta: < 24 h Alta, < 72 h Media, resto Baja
export function getUrgency(task: Pick<TaskDto, 'dueAt' | 'isOverdue'>, now = Date.now()): Urgency {
  if (task.isOverdue) return 'vencida';
  if (!task.dueAt) return 'sinFecha';
  const remaining = new Date(task.dueAt).getTime() - now;
  if (remaining < 0) return 'vencida';
  if (remaining < 24 * HOUR) return 'alta';
  if (remaining < 72 * HOUR) return 'media';
  return 'baja';
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  sinFecha: 'Sin fecha',
  vencida: 'Vencida',
};

export const urgencyColor = (task: Pick<TaskDto, 'dueAt' | 'isOverdue'>): string =>
  urgencyColors[getUrgency(task)];

// "YYYY-MM-DD" de una fecha en la zona horaria del celular
const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Campos mínimos para agrupar por fecha
type DueFields = Pick<TaskDto, 'dueDate' | 'dueAt' | 'isOverdue'>;

// Día de entrega: dueDate (ya viene en la zona horaria de la cuenta) o, si falta, dueAt
const taskDay = (task: DueFields): string | null =>
  task.dueDate ?? (task.dueAt ? dayKey(new Date(task.dueAt)) : null);

export type DueGroupKey = 'vencidas' | 'hoy' | 'manana' | 'semana' | 'despues' | 'sinFecha';

export type DueGroup<T extends DueFields = TaskDto> = { key: DueGroupKey; title: string; tasks: T[] };

const GROUP_TITLES: Record<DueGroupKey, string> = {
  vencidas: 'Vencidas',
  hoy: 'Hoy',
  manana: 'Mañana',
  semana: 'Esta semana',
  despues: 'Más adelante',
  sinFecha: 'Sin fecha',
};

// Agrupa en Hoy, Mañana, Esta semana (hasta el domingo), Más adelante y Sin fecha.
// Las vencidas van aparte, arriba, para que no se pierdan.
export function groupByDue<T extends DueFields>(tasks: T[], now = new Date()): DueGroup<T>[] {
  const today = dayKey(now);
  const tomorrow = dayKey(addDays(now, 1));
  const daysToSunday = (7 - now.getDay()) % 7; // la semana va de lunes a domingo
  const endOfWeek = dayKey(addDays(now, daysToSunday));

  const groups: Record<DueGroupKey, T[]> = {
    vencidas: [], hoy: [], manana: [], semana: [], despues: [], sinFecha: [],
  };

  for (const task of tasks) {
    const day = taskDay(task);
    if (task.isOverdue) groups.vencidas.push(task);
    else if (!day) groups.sinFecha.push(task);
    else if (day <= today) groups.hoy.push(task);
    else if (day === tomorrow) groups.manana.push(task);
    else if (day <= endOfWeek) groups.semana.push(task);
    else groups.despues.push(task);
  }

  const byDue = (a: T, b: T) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '');

  return (Object.keys(groups) as DueGroupKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, title: GROUP_TITLES[key], tasks: groups[key].sort(byDue) }));
}

// Fecha legible en español de Colombia: "miércoles, 20 de noviembre · 6:00 p. m."
export function formatDue(task: Pick<TaskDto, 'dueDate' | 'dueTime' | 'dueAt'>, long = false): string {
  if (!task.dueDate && !task.dueAt) return 'Sin fecha de entrega';

  const date = task.dueDate
    ? new Date(`${task.dueDate}T${task.dueTime ?? '00:00'}:00`)
    : new Date(task.dueAt as string);

  const day = date.toLocaleDateString('es-CO', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' });

  if (task.dueDate && !task.dueTime) return `${day} · todo el día`;
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

// Fecha relativa corta para listas: "hace 5 min", "hace 2 h", "12 nov"
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
