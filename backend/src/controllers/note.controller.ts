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
  async list(req: Request, res: Response<ListNotesResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListNotesQuery(req.query); // valida los query params
    res.status(200).json(await noteService.listNotes(session.userId, filters));
  },

  async create(req: Request, res: Response<CreateNoteResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateNote(req.body); // valida y filtra el body
    res.status(201).json(await noteService.createNote(session.userId, dto));
  },

  async update(req: Request, res: Response<UpdateNoteResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const noteId = validateUuidParam(req.params.noteId, "noteId"); // 400 si el ID no es UUID
    const dto = validateUpdateNote(req.body); // 400 si el body es inválido
    res.status(200).json(await noteService.updateNote(session.userId, noteId, dto));
  },

  async remove(req: Request, res: Response<DeleteNoteResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const noteId = validateUuidParam(req.params.noteId, "noteId"); // 400 si el ID no es UUID
    res.status(200).json(await noteService.deleteNote(session.userId, noteId));
  },
};
