import { randomUUID } from "node:crypto";
import {
  ListTipsFilters,
  ListTipsResponseDto,
  ListTipTagsResponseDto,
  SaveTipResponseDto,
  TipDetailDto,
} from "../models/tip.dto";
import { SavedTip, Tip } from "../models/tip.model";
import { HttpError } from "../utils/http-error";
import { fold } from "../utils/text";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor
const tips: Tip[] = [];
const savedTips: SavedTip[] = [];

const isSaved = (userId: number, tipId: string): boolean =>
  savedTips.some((s) => s.userId === userId && s.tipId === tipId);

const findTip = (tipId: string, notFoundMessage = "Tip no encontrado"): Tip => {
  const tip = tips.find((t) => t.id === tipId);
  if (!tip) throw new HttpError(404, notFoundMessage);
  return tip;
};

export const tipService = {
  listTips(userId: number, filters: ListTipsFilters): ListTipsResponseDto {
    const tag = filters.tag ? fold(filters.tag) : undefined;
    const term = filters.search ? fold(filters.search) : undefined;

    const filtered = tips
      .filter((t) => !filters.savedOnly || isSaved(userId, t.id))
      .filter((t) => tag === undefined || t.tags.some((x) => fold(x) === tag))
      .filter(
        (t) =>
          term === undefined ||
          fold(t.title).includes(term) ||
          fold(t.summary).includes(term) ||
          t.tags.some((x) => fold(x).includes(term)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (filters.page - 1) * filters.limit;

    return {
      data: filtered.slice(start, start + filters.limit).map((t) => ({
        id: t.id,
        title: t.title,
        summary: t.summary,
        category: t.category,
        tags: [...t.tags],
        readingTimeMin: t.readingTimeMin,
        isSaved: isSaved(userId, t.id),
      })),
      total: filtered.length,
    };
  },

  getTip(userId: number, tipId: string): TipDetailDto {
    const tip = findTip(tipId);
    return {
      id: tip.id,
      title: tip.title,
      content: tip.content,
      author: tip.author,
      tags: [...tip.tags],
      resources: [...tip.resources],
      isSaved: isSaved(userId, tip.id),
      createdAt: tip.createdAt.toISOString(),
    };
  },

  listTags(): ListTipTagsResponseDto {
    // Conteo de tips por etiqueta (sin distinguir mayúsculas ni acentos)
    const counts = new Map<string, { name: string; count: number }>();
    for (const tip of tips) {
      for (const tag of tip.tags) {
        const key = fold(tag);
        const entry = counts.get(key) ?? { name: tag, count: 0 };
        entry.count++;
        counts.set(key, entry);
      }
    }
    const tags = [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"),
    );
    return { tags };
  },

  saveTip(userId: number, tipId: string): SaveTipResponseDto {
    findTip(tipId, "Tip no existe");
    if (isSaved(userId, tipId)) throw new HttpError(409, "El tip ya estaba guardado");

    savedTips.push({ userId, tipId, savedAt: new Date() });
    return { message: "Tip guardado en favoritos", tipId, isSaved: true };
  },

  unsaveTip(userId: number, tipId: string): SaveTipResponseDto {
    findTip(tipId);
    const index = savedTips.findIndex((s) => s.userId === userId && s.tipId === tipId);
    if (index === -1) throw new HttpError(404, "El tip no estaba en tus guardados");

    savedTips.splice(index, 1);
    return { message: "Tip eliminado de favoritos", tipId, isSaved: false };
  },
};

// ---- Catálogo inicial de tips. Temporal, hasta tener un panel para administrarlos ----
const daysAgo = (d: number): Date => new Date(Date.now() - d * 86_400_000);

const seed = (data: Omit<Tip, "id" | "createdAt">, agoDays: number): void => {
  tips.push({ id: randomUUID(), createdAt: daysAgo(agoDays), ...data });
};

seed(
  {
    title: "Técnica Pomodoro",
    summary: "Estudia en bloques de 25 minutos con descansos cortos para mantener la concentración.",
    content:
      "1. Elige una tarea.\n2. Programa 25 minutos y trabaja sin distracciones.\n3. Descansa 5 minutos.\n4. Cada 4 pomodoros, toma un descanso largo de 15 a 30 minutos.",
    category: "Productividad",
    author: "Equipo NotiU",
    tags: ["Productividad", "Concentración"],
    readingTimeMin: 3,
    resources: ["https://es.wikipedia.org/wiki/T%C3%A9cnica_Pomodoro"],
  },
  10,
);
seed(
  {
    title: "Active Recall (recuerdo activo)",
    summary: "Ponte a prueba en lugar de releer: recuperar la información la fija en la memoria.",
    content:
      "Cierra el cuaderno y escribe todo lo que recuerdes del tema. Luego compara con tus apuntes y repasa solo lo que olvidaste. Las tarjetas de preguntas y los exámenes de práctica son formas de recuerdo activo.",
    category: "Memoria",
    author: "Equipo NotiU",
    tags: ["Memoria", "Exámenes"],
    readingTimeMin: 4,
    resources: [],
  },
  8,
);
seed(
  {
    title: "Repaso espaciado",
    summary: "Repasa en intervalos cada vez más largos para recordar a largo plazo.",
    content:
      "Repasa el tema al día siguiente, luego a los 3 días, a la semana y a las dos semanas. Herramientas como Anki automatizan los intervalos.",
    category: "Memoria",
    author: "Equipo NotiU",
    tags: ["Memoria", "Exámenes", "Productividad"],
    readingTimeMin: 4,
    resources: ["https://apps.ankiweb.net/"],
  },
  6,
);
seed(
  {
    title: "Técnica Feynman",
    summary: "Explica el tema con palabras simples, como si se lo enseñaras a otra persona.",
    content:
      "1. Escribe el concepto.\n2. Explícalo con palabras sencillas.\n3. Identifica dónde te trabas y vuelve a la fuente.\n4. Simplifica y usa analogías.",
    category: "Comprensión",
    author: "Equipo NotiU",
    tags: ["Comprensión", "Exámenes"],
    readingTimeMin: 3,
    resources: [],
  },
  4,
);
seed(
  {
    title: "Prepara la semana de parciales",
    summary: "Organiza tus materias por fecha y dificultad para no dejar todo para el final.",
    content:
      "Haz una lista de parciales con su fecha, asigna bloques de estudio empezando por los más difíciles y deja el día anterior solo para repasar.",
    category: "Organización",
    author: "Equipo NotiU",
    tags: ["Exámenes", "Productividad", "Organización"],
    readingTimeMin: 5,
    resources: [],
  },
  2,
);
