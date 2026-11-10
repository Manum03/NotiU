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
  list(req: Request, res: Response<ListTipsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListTipsQuery(req.query); // valida los query params
    res.status(200).json(tipService.listTips(session.userId, filters));
  },

  listTags(_req: Request, res: Response<ListTipTagsResponseDto>): void {
    res.status(200).json(tipService.listTags());
  },

  get(req: Request, res: Response<TipDetailDto>): void {
    const { session } = res.locals as AuthLocals;
    const tipId = validateUuidParam(req.params.tipId, "tipId"); // 400 si el ID no es UUID
    res.status(200).json(tipService.getTip(session.userId, tipId));
  },

  save(req: Request, res: Response<SaveTipResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const tipId = validateUuidParam(req.params.tipId, "tipId"); // 400 si el ID no es UUID
    res.status(201).json(tipService.saveTip(session.userId, tipId));
  },

  unsave(req: Request, res: Response<SaveTipResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const tipId = validateUuidParam(req.params.tipId, "tipId"); // 400 si el ID no es UUID
    res.status(200).json(tipService.unsaveTip(session.userId, tipId));
  },
};
