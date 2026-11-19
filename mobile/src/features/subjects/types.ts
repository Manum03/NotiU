export type SubjectStatus = 'cursando' | 'aprobada' | 'pendiente';
export type SubjectPriority = 'alta' | 'media' | 'baja' | 'sin_fecha';
export type ActivityType = 'tarea' | 'trabajo' | 'examen' | 'proyecto' | 'lectura' | 'otro';

export type Subject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  status: SubjectStatus;
  priority: SubjectPriority;
  teacher: string;
  color: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  activityType: ActivityType | null;
  reminder: { enabled: boolean; dateTime?: string };
  notes: string;
  progress: number;
  currentAverage: number;
};

export type SubjectsResponse = { data: Subject[]; total: number };

export const COLORS = {
  background: '#10060A',
  card: '#260A13',
  cardDone: '#3A2A2E',
  wine: '#800427',
  brightWine: '#AA0330',
  darkWine: '#4E021A',
  text: '#E9DDD3',
  muted: '#C9B8B1',
  soft: '#80666C',
  border: '#572033',
  orange: '#EE6520',
  yellow: '#EEE620',
  turquoise: '#20EEDB',
  purple: '#B23CFD',
  white: '#FFFFFF',
};

export const STATUS_LABEL: Record<SubjectStatus, string> = {
  cursando: 'EN CURSO',
  pendiente: 'PENDIENTE',
  aprobada: 'FINALIZADA',
};

export const STATUS_COLOR: Record<SubjectStatus, string> = {
  cursando: COLORS.brightWine,
  pendiente: '#9C484F',
  aprobada: '#D9CFCB',
};

export const PRIORITY_LABEL: Record<SubjectPriority, string> = {
  alta: 'PRIORIDAD ALTA',
  media: 'PRIORIDAD MEDIA',
  baja: 'PRIORIDAD BAJA',
  sin_fecha: 'PRIORIDAD SIN FECHA',
};

export const PRIORITY_COLOR: Record<SubjectPriority, string> = {
  alta: COLORS.orange,
  media: COLORS.yellow,
  baja: COLORS.turquoise,
  sin_fecha: COLORS.purple,
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  tarea: 'Tarea',
  trabajo: 'Trabajo',
  examen: 'Examen',
  proyecto: 'Proyecto académico',
  lectura: 'Lectura',
  otro: 'Otro',
};

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function parseDate(d: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function formatShortDate(dueDate: string | null): string {
  if (!dueDate) return 'Sin fecha';
  const p = parseDate(dueDate);
  if (!p) return 'Sin fecha';
  const [y, m, d] = p;
  const now = new Date();
  if (now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d) {
    return 'Hoy';
  }
  const name = MONTHS[m - 1].slice(0, 3);
  return `${d} ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

export function formatLongDate(dueDate: string | null): string {
  if (!dueDate) return 'Sin fecha definida';
  const p = parseDate(dueDate);
  if (!p) return 'Sin fecha definida';
  return `${p[2]} de ${MONTHS[p[1] - 1]} de ${p[0]}`;
}

export function formatTime(dueTime: string | null): string {
  if (!dueTime) return 'Sin hora definida';
  const m = /^(\d{1,2}):(\d{2})/.exec(dueTime);
  if (!m) return dueTime;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
}

export function reminderShortLabel(s: Subject): string {
  if (s.status === 'aprobada') return 'Recordatorio desactivado';
  return s.reminder.enabled ? 'Recordatorio activo' : 'Recordatorio por definir';
}