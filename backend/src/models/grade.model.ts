export const CORTES = [1, 2, 3, 4] as const;
export type Corte = (typeof CORTES)[number];

export interface Grade {
  id: string;
  subjectId: string; // la propiedad se deriva de la materia: no se guarda userId aquí
  title: string;
  score: number; // 0.0 - 5.0
  weight: number; // 1 - 100 (porcentaje de la nota final)
  corte?: Corte;
  date: string; // ISO 8601, tal como la envió el cliente
  createdAt: string; // ISO 8601
}