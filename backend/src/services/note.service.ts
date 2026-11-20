import { randomUUID } from "node:crypto";
import { db } from "../config/firebase";
import {
  CreateNoteDto,
  CreateNoteResponseDto,
  DeleteNoteResponseDto,
  ListNotesFilters,
  ListNotesResponseDto,
  NoteListItemDto,
  UpdateNoteDto,
  UpdateNoteResponseDto,
} from "../models/note.dto";
import { Note } from "../models/note.model";
import { HttpError } from "../utils/http-error";
import { toDateOrNow } from "../utils/firestore";
import { fold } from "../utils/text";
import { subjectService } from "./subject.service";

// Apuntes en Firestore: colección `notes/{noteId}` con el campo `userId`.
// Van en una colección general (y no dentro de users/{uid}) para poder distinguir
// "no existe" (404) de "es de otro estudiante" (403), como antes.
const notesCol = db.collection("notes");

const fromDoc = (id: string, d: FirebaseFirestore.DocumentData): Note => ({
  id,
  userId: String(d.userId ?? ""),
  title: String(d.title ?? ""),
  content: String(d.content ?? ""),
  subjectId: d.subjectId ?? null,
  tags: Array.isArray(d.tags) ? d.tags : [],
  isPinned: d.isPinned === true,
  createdAt: toDateOrNow(d.createdAt),
  updatedAt: toDateOrNow(d.updatedAt),
});

const toDoc = ({ id: _id, ...rest }: Note) => rest;

const toNoteListItem = (n: Note): NoteListItemDto => ({
  id: n.id,
  title: n.title,
  content: n.content,
  subjectId: n.subjectId,
  tags: [...n.tags],
  isPinned: n.isPinned,
  updatedAt: n.updatedAt.toISOString(),
});

/**
 * Busca un apunte y comprueba que sea del usuario.
 * 404 si no existe; 403 si existe pero es de otro estudiante (regla del inventario).
 */
const getOwnedNote = async (userId: string, noteId: string): Promise<Note> => {
  const snap = await notesCol.doc(noteId).get();
  if (!snap.exists) throw new HttpError(404, "Apunte no encontrado");
  const note = fromDoc(snap.id, snap.data() ?? {});
  if (note.userId !== userId) throw new HttpError(403, "No tienes permisos sobre este apunte");
  return note;
};

export const noteService = {
  async listNotes(userId: string, filters: ListNotesFilters): Promise<ListNotesResponseDto> {
    const term = filters.search ? fold(filters.search) : undefined;
    const tag = filters.tag ? fold(filters.tag) : undefined;

    // PRIMERO: solo los apuntes del usuario (consulta de un campo); el resto se filtra en memoria
    const snap = await notesCol.where("userId", "==", userId).get();
    const filtered = snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((n) => filters.subjectId === undefined || n.subjectId === filters.subjectId)
      .filter((n) => tag === undefined || n.tags.some((t) => fold(t) === tag))
      .filter((n) => term === undefined || fold(n.title).includes(term) || fold(n.content).includes(term))
      // Fijados primero; luego los editados más recientemente
      .sort(
        (a, b) =>
          Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.getTime() - a.updatedAt.getTime(),
      );

    const total = filtered.length;
    const start = (filters.page - 1) * filters.limit;

    return {
      data: filtered.slice(start, start + filters.limit).map(toNoteListItem),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async createNote(userId: string, dto: CreateNoteDto): Promise<CreateNoteResponseDto> {
    // Si se envía materia, debe existir y ser del usuario (404 si no)
    if (dto.subjectId !== undefined) await subjectService.getOwnedSubject(userId, dto.subjectId);

    const now = new Date();
    const note: Note = {
      id: randomUUID(),
      userId, // viene del token, nunca del body
      title: dto.title,
      content: dto.content,
      subjectId: dto.subjectId ?? null,
      tags: dto.tags ?? [],
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };
    await notesCol.doc(note.id).set(toDoc(note));

    return {
      message: "Apunte creado",
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        subjectId: note.subjectId,
        tags: [...note.tags],
        createdAt: note.createdAt.toISOString(),
      },
    };
  },

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto): Promise<UpdateNoteResponseDto> {
    const note = await getOwnedNote(userId, noteId); // 404 / 403

    // Lo que puede fallar va primero: así el apunte no queda a medio actualizar
    if (dto.subjectId) await subjectService.getOwnedSubject(userId, dto.subjectId);

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.subjectId !== undefined) note.subjectId = dto.subjectId;
    if (dto.tags !== undefined) note.tags = dto.tags;
    if (dto.isPinned !== undefined) note.isPinned = dto.isPinned;
    note.updatedAt = new Date();
    await notesCol.doc(note.id).set(toDoc(note));

    return {
      message: "Apunte actualizado",
      note: { id: note.id, title: note.title, updatedAt: note.updatedAt.toISOString() },
    };
  },

  async deleteNote(userId: string, noteId: string): Promise<DeleteNoteResponseDto> {
    const note = await getOwnedNote(userId, noteId); // 404 / 403
    await notesCol.doc(note.id).delete();
    return { message: "Apunte eliminado", deletedId: note.id };
  },

  // La usa DELETE /api/subjects/:subjectId: los apuntes se conservan sin materia.
  // Devuelve las referencias para quitarles la materia dentro del mismo batch.
  async refsBySubject(userId: string, subjectId: string): Promise<FirebaseFirestore.DocumentReference[]> {
    const snap = await notesCol.where("subjectId", "==", subjectId).get();
    // Los ids de materia son UUID únicos; igual se comprueba el dueño por seguridad
    return snap.docs.filter((doc) => doc.data().userId === userId).map((doc) => doc.ref);
  },
};
