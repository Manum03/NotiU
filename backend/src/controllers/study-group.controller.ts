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
  async list(req: Request, res: Response<ListStudyGroupsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListStudyGroupsQuery(req.query); // valida los query params
    res.status(200).json(await studyGroupService.listGroups(session.userId, filters));
  },

  async get(req: Request, res: Response<StudyGroupDetailDto>): Promise<void> {
    const groupId = validateUuidParam(req.params.groupId, "groupId"); // 400 si el ID no es UUID
    res.status(200).json(await studyGroupService.getGroup(groupId));
  },

  async create(req: Request, res: Response<CreateStudyGroupResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateStudyGroup(req.body); // valida y filtra el body
    res.status(201).json(await studyGroupService.createGroup(session.userId, dto));
  },

  async join(req: Request, res: Response<JoinStudyGroupResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const groupId = validateUuidParam(req.params.groupId, "groupId"); // 400 si el ID no es UUID
    res.status(200).json(await studyGroupService.joinGroup(session.userId, groupId));
  },

  async leave(req: Request, res: Response<LeaveStudyGroupResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const groupId = validateUuidParam(req.params.groupId, "groupId"); // 400 si el ID no es UUID
    res.status(200).json(await studyGroupService.leaveGroup(session.userId, groupId));
  },
};
