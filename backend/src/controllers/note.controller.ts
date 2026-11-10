import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  CreateNoteResponseDto,
  DeleteNoteResponseDto,
  ListNotesResponseDto,
  UpdateNoteResponseDto,
} from "../models/note.dto";
import { noteService } from "../services/note.service";
import {
  validateCreateNote,
  validateListNotesQuery,
  validateUpdateNote,
  validateUuidParam,
} from "../utils/validators";

export const noteController = {
  list(req: Request, res: Response<ListNotesResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListNotesQuery(req.query); // valida los query params
    res.status(200).json(noteService.listNotes(session.userId, filters));
  },

  create(req: Request, res: Response<CreateNoteResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateNote(req.body); // valida y filtra el body
    res.status(201).json(noteService.createNote(session.userId, dto));
  },

  update(req: Request, res: Response<UpdateNoteResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const noteId = validateUuidParam(req.params.noteId, "noteId"); // 400 si el ID no es UUID
    const dto = validateUpdateNote(req.body); // 400 si el body es inválido
    res.status(200).json(noteService.updateNote(session.userId, noteId, dto));
  },

  remove(req: Request, res: Response<DeleteNoteResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const noteId = validateUuidParam(req.params.noteId, "noteId"); // 400 si el ID no es UUID
    res.status(200).json(noteService.deleteNote(session.userId, noteId));
  },
};
