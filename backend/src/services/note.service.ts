import { randomUUID } from "node:crypto";
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
import { fold } from "../utils/text";
import { subjectService } from "./subject.service";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor
const notes: Note[] = [];

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
const getOwnedNote = (userId: number, noteId: string): Note => {
  const note = notes.find((n) => n.id === noteId);
  if (!note) throw new HttpError(404, "Apunte no encontrado");
  if (note.userId !== userId) throw new HttpError(403, "No tienes permisos sobre este apunte");
  return note;
};

export const noteService = {
  listNotes(userId: number, filters: ListNotesFilters): ListNotesResponseDto {
    const term = filters.search ? fold(filters.search) : undefined;
    const tag = filters.tag ? fold(filters.tag) : undefined;

    const filtered = notes
      .filter((n) => n.userId === userId) // PRIMERO: solo los apuntes del usuario
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

  createNote(userId: number, dto: CreateNoteDto): CreateNoteResponseDto {
    // Si se envía materia, debe existir y ser del usuario (404 si no)
    if (dto.subjectId !== undefined) subjectService.getOwnedSubject(userId, dto.subjectId);

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
    notes.push(note);

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

  updateNote(userId: number, noteId: string, dto: UpdateNoteDto): UpdateNoteResponseDto {
    const note = getOwnedNote(userId, noteId); // 404 / 403

    // Lo que puede fallar va primero: así el apunte no queda a medio actualizar
    if (dto.subjectId) subjectService.getOwnedSubject(userId, dto.subjectId);

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.subjectId !== undefined) note.subjectId = dto.subjectId;
    if (dto.tags !== undefined) note.tags = dto.tags;
    if (dto.isPinned !== undefined) note.isPinned = dto.isPinned;
    note.updatedAt = new Date();

    return {
      message: "Apunte actualizado",
      note: { id: note.id, title: note.title, updatedAt: note.updatedAt.toISOString() },
    };
  },

  deleteNote(userId: number, noteId: string): DeleteNoteResponseDto {
    const note = getOwnedNote(userId, noteId); // 404 / 403
    notes.splice(notes.indexOf(note), 1);
    return { message: "Apunte eliminado", deletedId: note.id };
  },

  // La usa DELETE /api/subjects/:subjectId: los apuntes se conservan sin materia
  detachSubject(subjectId: string): void {
    for (const note of notes) {
      if (note.subjectId === subjectId) note.subjectId = null;
    }
  },
};
