// ---- Listado (GET /api/notes) ----
export interface ListNotesFilters {
  subjectId?: string;
  tag?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface NoteListItemDto {
  id: string;
  title: string;
  content: string;
  subjectId: string | null;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
}

export interface ListNotesResponseDto {
  data: NoteListItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
// ---- Creación (POST /api/notes) ----
export interface CreateNoteDto {
  title: string;
  content: string;
  subjectId?: string;
  tags?: string[];
}

export interface CreateNoteResponseDto {
  message: string;
  note: {
    id: string;
    title: string;
    content: string;
    subjectId: string | null;
    tags: string[];
    createdAt: string;
  };
}
// ---- Actualización (PATCH /api/notes/:noteId) ----
// Todo es opcional: PATCH = actualización parcial. subjectId = null desvincula la materia
export interface UpdateNoteDto {
  title?: string;
  content?: string;
  subjectId?: string | null;
  tags?: string[];
  isPinned?: boolean;
}

export interface UpdateNoteResponseDto {
  message: string;
  note: {
    id: string;
    title: string;
    updatedAt: string;
  };
}
// ---- Eliminación (DELETE /api/notes/:noteId) ----
export interface DeleteNoteResponseDto {
  message: string;
  deletedId: string;
}
