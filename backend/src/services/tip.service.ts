import { randomUUID } from "node:crypto";
import { db } from "../config/firebase";
import {
  ListTipsFilters,
  ListTipsResponseDto,
  ListTipTagsResponseDto,
  SaveTipResponseDto,
  TipDetailDto,
} from "../models/tip.dto";
import { Tip } from "../models/tip.model";
import { HttpError } from "../utils/http-error";
import { toDateOrNow } from "../utils/firestore";
import { fold } from "../utils/text";

// Tips en Firestore:
// - Catálogo compartido en `tips/{tipId}` (se llena con la semilla si la colección está vacía).
// - Guardados de cada estudiante en `users/{uid}/savedTips/{tipId}` ({ savedAt }).
const tipsCol = db.collection("tips");
const savedCol = (userId: string) => db.collection("users").doc(userId).collection("savedTips");

const fromDoc = (id: string, d: FirebaseFirestore.DocumentData): Tip => ({
  id,
  title: String(d.title ?? ""),
  summary: String(d.summary ?? ""),
  content: String(d.content ?? ""),
  category: String(d.category ?? ""),
  author: String(d.author ?? ""),
  tags: Array.isArray(d.tags) ? d.tags : [],
  readingTimeMin: Number(d.readingTimeMin ?? 0),
  resources: Array.isArray(d.resources) ? d.resources : [],
  createdAt: toDateOrNow(d.createdAt),
});

// La semilla se escribe una sola vez por proceso (y solo si la colección está vacía)
let catalogReady: Promise<void> | null = null;

const ensureCatalog = (): Promise<void> => {
  catalogReady ??= (async () => {
    const existing = await tipsCol.limit(1).get();
    if (!existing.empty) return;
    const batch = db.batch();
    for (const [data, agoDays] of SEED) {
      batch.set(tipsCol.doc(randomUUID()), { ...data, createdAt: daysAgo(agoDays) });
    }
    await batch.commit();
  })().catch((err: unknown) => {
    catalogReady = null; // se reintenta en la próxima petición
    throw err;
  });
  return catalogReady;
};

const loadTips = async (): Promise<Tip[]> => {
  await ensureCatalog();
  const snap = await tipsCol.get();
  return snap.docs.map((doc) => fromDoc(doc.id, doc.data()));
};

const loadSavedIds = async (userId: string): Promise<Set<string>> => {
  const snap = await savedCol(userId).get();
  return new Set(snap.docs.map((doc) => doc.id));
};

const findTip = async (tipId: string, notFoundMessage = "Tip no encontrado"): Promise<Tip> => {
  await ensureCatalog();
  const snap = await tipsCol.doc(tipId).get();
  if (!snap.exists) throw new HttpError(404, notFoundMessage);
  return fromDoc(snap.id, snap.data() ?? {});
};

const isSaved = async (userId: string, tipId: string): Promise<boolean> =>
  (await savedCol(userId).doc(tipId).get()).exists;

export const tipService = {
  // Se llama al arrancar el servidor para sembrar el catálogo si está vacío
  ensureCatalog,

  async listTips(userId: string, filters: ListTipsFilters): Promise<ListTipsResponseDto> {
    const tag = filters.tag ? fold(filters.tag) : undefined;
    const term = filters.search ? fold(filters.search) : undefined;

    const [tips, savedIds] = await Promise.all([loadTips(), loadSavedIds(userId)]);

    const filtered = tips
      .filter((t) => !filters.savedOnly || savedIds.has(t.id))
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
        isSaved: savedIds.has(t.id),
      })),
      total: filtered.length,
    };
  },

  async getTip(userId: string, tipId: string): Promise<TipDetailDto> {
    const [tip, saved] = await Promise.all([findTip(tipId), isSaved(userId, tipId)]);
    return {
      id: tip.id,
      title: tip.title,
      content: tip.content,
      author: tip.author,
      tags: [...tip.tags],
      resources: [...tip.resources],
      isSaved: saved,
      createdAt: tip.createdAt.toISOString(),
    };
  },

  async listTags(): Promise<ListTipTagsResponseDto> {
    // Conteo de tips por etiqueta (sin distinguir mayúsculas ni acentos)
    const counts = new Map<string, { name: string; count: number }>();
    for (const tip of await loadTips()) {
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

  async saveTip(userId: string, tipId: string): Promise<SaveTipResponseDto> {
    await findTip(tipId, "Tip no existe");
    if (await isSaved(userId, tipId)) throw new HttpError(409, "El tip ya estaba guardado");

    await savedCol(userId).doc(tipId).set({ savedAt: new Date() });
    return { message: "Tip guardado en favoritos", tipId, isSaved: true };
  },

  async unsaveTip(userId: string, tipId: string): Promise<SaveTipResponseDto> {
    await findTip(tipId);
    if (!(await isSaved(userId, tipId))) throw new HttpError(404, "El tip no estaba en tus guardados");

    await savedCol(userId).doc(tipId).delete();
    return { message: "Tip eliminado de favoritos", tipId, isSaved: false };
  },
};

// ---- Catálogo inicial de tips (semilla). Se guarda en Firestore la primera vez ----
// Temporal, hasta tener un panel para administrarlos.
const daysAgo = (d: number): Date => new Date(Date.now() - d * 86_400_000);

const SEED: [Omit<Tip, "id" | "createdAt">, number][] = [];

const seed = (data: Omit<Tip, "id" | "createdAt">, agoDays: number): void => {
  SEED.push([data, agoDays]);
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
