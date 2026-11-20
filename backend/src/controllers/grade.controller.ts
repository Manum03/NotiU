import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  CreateGradeResponseDto,
  DeleteGradeResponseDto,
  GradesAverageResponseDto,
  ListGradesResponseDto,
  SubjectGradesResponseDto,
  SubjectProgressDto,
  UpdateGradeResponseDto,
} from "../models/grade.dto";
import { gradeService } from "../services/grade.service";
import { subjectService } from "../services/subject.service";
import {
  validateAverageQuery,
  validateCreateGrade,
  validateGradeId,
  validateListGradesQuery,
  validateSubjectId,
  validateUpdateGrade,
} from "../utils/validators";

export const gradeController = {
  async create(req: Request, res: Response<CreateGradeResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const dto = validateCreateGrade(req.body); // 400 si el body es inválido
    // 404 si la materia no existe o no es del usuario (el mismo error en ambos casos)
    const subject = await subjectService.getOwnedSubject(session.userId, subjectId);
    res.status(201).json(await gradeService.createGrade(subject, dto));
  },

  async listBySubject(req: Request, res: Response<SubjectGradesResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const subject = await subjectService.getOwnedSubject(session.userId, subjectId); // 404
    res.status(200).json(await gradeService.listBySubject(subject));
  },

  async list(req: Request, res: Response<ListGradesResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListGradesQuery(req.query); // 400 si los filtros son inválidos
    // Solo las materias del usuario: de ahí sale el aislamiento del consolidado
    const subjects = await subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(await gradeService.listByUser(session.userId, subjects, filters));
  },

  async getProgress(req: Request, res: Response<SubjectProgressDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const subject = await subjectService.getOwnedSubject(session.userId, subjectId); // 404
    res.status(200).json(await gradeService.getProgress(subject));
  },

  async update(req: Request, res: Response<UpdateGradeResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const gradeId = validateGradeId(req.params.gradeId); // 400 si el ID no es UUID
    const dto = validateUpdateGrade(req.body); // 400 si el body es inválido
    // El service comprueba que la nota pertenezca a una de SUS materias (404 si no)
    const subjects = await subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(await gradeService.updateGrade(session.userId, subjects, gradeId, dto));
  },

  async remove(req: Request, res: Response<DeleteGradeResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const gradeId = validateGradeId(req.params.gradeId); // 400 si el ID no es UUID
    const subjects = await subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(await gradeService.deleteGrade(session.userId, subjects, gradeId));
  },

  async average(req: Request, res: Response<GradesAverageResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateAverageQuery(req.query); // 400 si semester es inválido
    const subjects = await subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(await gradeService.getAverage(session.userId, subjects, filters));
  },
};