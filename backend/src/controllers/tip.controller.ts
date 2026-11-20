import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  ListTipsResponseDto,
  ListTipTagsResponseDto,
  SaveTipResponseDto,
  TipDetailDto,
} from "../models/tip.dto";
import { tipService } from "../services/tip.service";
import { validateListTipsQuery, validateUuidParam } from "../utils/validators";

export const tipController = {
  async list(req: Request, res: Response<ListTipsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListTipsQuery(req.query); // valida los query params
    res.status(200).json(await tipService.listTips(session.userId, filters));
  },

  async listTags(_req: Request, res: Response<ListTipTagsResponseDto>): Promise<void> {
    res.status(200).json(await tipService.listTags());
  },

  async get(req: Request, res: Response<TipDetailDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const tipId = validateUuidParam(req.params.tipId, "tipId"); // 400 si el ID no es UUID
    res.status(200).json(await tipService.getTip(session.userId, tipId));
  },

  async save(req: Request, res: Response<SaveTipResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const tipId = validateUuidParam(req.params.tipId, "tipId"); // 400 si el ID no es UUID
    res.status(201).json(await tipService.saveTip(session.userId, tipId));
  },

  async unsave(req: Request, res: Response<SaveTipResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const tipId = validateUuidParam(req.params.tipId, "tipId"); // 400 si el ID no es UUID
    res.status(200).json(await tipService.unsaveTip(session.userId, tipId));
  },
};
