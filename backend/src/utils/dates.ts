import { config } from "../config/env";

const dateTimeFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: config.timezone,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: config.timezone,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const relativeFmt = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

// "jueves, 20 de noviembre, 11:59 p. m."
export const formatDue = (date: Date, allDay = false): string =>
  (allDay ? dateFmt : dateTimeFmt).format(date);

// "en 2 horas", "mañana", "en 3 días", "hace 5 minutos"
export const relativeFromNow = (date: Date, now = new Date()): string => {
  const diffMin = Math.round((date.getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(diffMin);
  if (abs < 60) return relativeFmt.format(diffMin, "minute");
  if (abs < 48 * 60) return relativeFmt.format(Math.round(diffMin / 60), "hour");
  return relativeFmt.format(Math.round(diffMin / 1440), "day");
};

// Desfase (en minutos) de una zona horaria IANA en una fecha dada. Bogotá -> -300
const timezoneOffsetMinutes = (date: Date, timeZone: string): number => {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(part ?? "");
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
};

// Fecha y hora "de reloj" en la zona horaria de la app -> instante real (Date)
export const appDateTime = (year: number, month: number, day: number, hours = 23, minutes = 59): Date => {
  const asUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const offset = timezoneOffsetMinutes(asUtc, config.timezone);
  return new Date(asUtc.getTime() - offset * 60_000);
};

// 23:59 de un día calendario en la zona horaria de la app (para entregas "sin hora")
export const endOfDayInAppTimezone = (year: number, month: number, day: number): Date =>
  appDateTime(year, month, day, 23, 59);

// "2026-11-24" + "14:30" (hora de Colombia) -> Date. Sin hora = 23:59 de ese día.
export const fromAppDateParts = (date: string, time: string | null): Date => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time ? time.split(":").map(Number) : [23, 59];
  return appDateTime(y, m, d, h, min);
};

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: config.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Date -> { date: "2026-11-24", time: "14:30" } en la zona horaria de la app
export const toAppDateParts = (value: Date): { date: string; time: string } => {
  const p = Object.fromEntries(partsFmt.formatToParts(value).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};
