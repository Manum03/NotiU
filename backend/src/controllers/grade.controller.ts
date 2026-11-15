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
  create(req: Request, res: Response<CreateGradeResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const dto = validateCreateGrade(req.body); // 400 si el body es inválido
    // 404 si la materia no existe o no es del usuario (el mismo error en ambos casos)
    const subject = subjectService.getOwnedSubject(session.userId, subjectId);
    res.status(201).json(gradeService.createGrade(subject, dto));
  },

  listBySubject(req: Request, res: Response<SubjectGradesResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const subject = subjectService.getOwnedSubject(session.userId, subjectId); // 404
    res.status(200).json(gradeService.listBySubject(subject));
  },

  list(req: Request, res: Response<ListGradesResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListGradesQuery(req.query); // 400 si los filtros son inválidos
    // Solo las materias del usuario: de ahí sale el aislamiento del consolidado
    const subjects = subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(gradeService.listByUser(subjects, filters));
  },

  getProgress(req: Request, res: Response<SubjectProgressDto>): void {
    const { session } = res.locals as AuthLocals;
    const subjectId = validateSubjectId(req.params.subjectId); // 400 si el ID no es UUID
    const subject = subjectService.getOwnedSubject(session.userId, subjectId); // 404
    res.status(200).json(gradeService.getProgress(subject));
  },

  update(req: Request, res: Response<UpdateGradeResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const gradeId = validateGradeId(req.params.gradeId); // 400 si el ID no es UUID
    const dto = validateUpdateGrade(req.body); // 400 si el body es inválido
    // El service comprueba que la nota pertenezca a una de SUS materias (404 si no)
    const subjects = subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(gradeService.updateGrade(subjects, gradeId, dto));
  },

  remove(req: Request, res: Response<DeleteGradeResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const gradeId = validateGradeId(req.params.gradeId); // 400 si el ID no es UUID
    const subjects = subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(gradeService.deleteGrade(subjects, gradeId));
  },

  average(req: Request, res: Response<GradesAverageResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateAverageQuery(req.query); // 400 si semester es inválido
    const subjects = subjectService.getOwnedSubjects(session.userId);
    res.status(200).json(gradeService.getAverage(subjects, filters));
  },
};