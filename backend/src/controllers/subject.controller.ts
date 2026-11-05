import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { CreateSubjectResponseDto, ListSubjectsResponseDto } from "../models/subject.dto";
import { subjectService } from "../services/subject.service";
import { validateCreateSubject, validateListSubjectsQuery } from "../utils/validators";

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
};