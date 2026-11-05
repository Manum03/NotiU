import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { SettingsResponseDto, UpdateSettingsResponseDto } from "../models/settings.dto";
import { settingsService } from "../services/settings.service";
import { validateUpdateSettings } from "../utils/validators";

export const settingsController = {
  get(_req: Request, res: Response<SettingsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(settingsService.getSettings(session.userId));
  },

  update(req: Request, res: Response<UpdateSettingsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateUpdateSettings(req.body); // valida y filtra el body
    res.status(200).json(settingsService.updateSettings(session.userId, dto));
  },
};