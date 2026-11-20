import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  CreateSubjectResponseDto,
  DeleteSubjectResponseDto,
  ListSubjectsResponseDto,
  SubjectDetailDto,
  SubjectScheduleDto,
  UpdateSubjectResponseDto,
} from "../models/subject.dto";
import { subjectService } from "../services/subject.service";
import {
  validateCreateSubject,
  validateListSubjectsQuery,
  validateSubjectId,
  validateUpdateSubject,
} from "../utils/validators";

export const subjectController = {
  async create(req: Request, res: Response<CreateSubjectResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateSubject(req.body); // valida y filtra el body
    res.status(201).json(await subjectService.createSubject(session.userId, dto));
  },

  async list(req: Request, res: Response<ListSubjectsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListSubjectsQuery(req.query); // valida los query params
    res.status(200).json(await subjectService.listSubjects(session.userId, filters));
  },

  async get(req: Request, res: Response<SubjectDetailDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // valida el formato del ID
    res.status(200).json(await subjectService.getSubject(session.userId, subjectId));
  },

  async update(req: Request, res: Response<UpdateSubjectResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const dto = validateUpdateSubject(req.body); // 400 si el body es inválido
    res.status(200).json(await subjectService.updateSubject(session.userId, subjectId, dto));
  },

  async getSchedule(req: Request, res: Response<SubjectScheduleDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    res.status(200).json(await subjectService.getSchedule(session.userId, subjectId));
  },

  async remove(req: Request, res: Response<DeleteSubjectResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    res.status(200).json(await subjectService.deleteSubject(session.userId, subjectId));
  },
};