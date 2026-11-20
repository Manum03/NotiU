import { Timestamp } from "firebase-admin/firestore";

// Firestore devuelve Timestamp; en el dominio trabajamos con Date
export const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const toDateOrNow = (value: unknown): Date => toDate(value) ?? new Date();

export const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// Divide un arreglo en grupos de tamaño fijo (los batch de Firestore aceptan máx. 500 operaciones)
export const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
