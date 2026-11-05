import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { CreateSubjectResponseDto } from "../models/subject.dto";
import { subjectService } from "../services/subject.service";
import { validateCreateSubject } from "../utils/validators";

export const subjectController = {
  create(req: Request, res: Response<CreateSubjectResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateSubject(req.body); // valida y filtra el body
    res.status(201).json(subjectService.createSubject(session.userId, dto));
  },
};