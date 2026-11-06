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
  create(req: Request, res: Response<CreateSubjectResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateSubject(req.body); // valida y filtra el body
    res.status(201).json(subjectService.createSubject(session.userId, dto));
  },

  list(req: Request, res: Response<ListSubjectsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListSubjectsQuery(req.query); // valida los query params
    res.status(200).json(subjectService.listSubjects(session.userId, filters));
  },

  get(req: Request, res: Response<SubjectDetailDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // valida el formato del ID
    res.status(200).json(subjectService.getSubject(session.userId, subjectId));
  },

  update(req: Request, res: Response<UpdateSubjectResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const dto = validateUpdateSubject(req.body); // 400 si el body es inválido
    res.status(200).json(subjectService.updateSubject(session.userId, subjectId, dto));
  },

  getSchedule(req: Request, res: Response<SubjectScheduleDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    res.status(200).json(subjectService.getSchedule(session.userId, subjectId));
  },

  remove(req: Request, res: Response<DeleteSubjectResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    res.status(200).json(subjectService.deleteSubject(session.userId, subjectId));
  },
};