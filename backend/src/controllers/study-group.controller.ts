import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  CreateStudyGroupResponseDto,
  JoinStudyGroupResponseDto,
  LeaveStudyGroupResponseDto,
  ListStudyGroupsResponseDto,
  StudyGroupDetailDto,
} from "../models/study-group.dto";
import { studyGroupService } from "../services/study-group.service";
import {
  validateCreateStudyGroup,
  validateListStudyGroupsQuery,
  validateUuidParam,
} from "../utils/validators";

export const studyGroupController = {
  list(req: Request, res: Response<ListStudyGroupsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListStudyGroupsQuery(req.query); // valida los query params
    res.status(200).json(studyGroupService.listGroups(session.userId, filters));
  },

  get(req: Request, res: Response<StudyGroupDetailDto>): void {
    const groupId = validateUuidParam(req.params.groupId, "groupId"); // 400 si el ID no es UUID
    res.status(200).json(studyGroupService.getGroup(groupId));
  },

  create(req: Request, res: Response<CreateStudyGroupResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateStudyGroup(req.body); // valida y filtra el body
    res.status(201).json(studyGroupService.createGroup(session.userId, dto));
  },

  join(req: Request, res: Response<JoinStudyGroupResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const groupId = validateUuidParam(req.params.groupId, "groupId"); // 400 si el ID no es UUID
    res.status(200).json(studyGroupService.joinGroup(session.userId, groupId));
  },

  leave(req: Request, res: Response<LeaveStudyGroupResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const groupId = validateUuidParam(req.params.groupId, "groupId"); // 400 si el ID no es UUID
    res.status(200).json(studyGroupService.leaveGroup(session.userId, groupId));
  },
};
