import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { SettingsResponseDto } from "../models/settings.dto";
import { settingsService } from "../services/settings.service";

export const settingsController = {
  get(_req: Request, res: Response<SettingsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(settingsService.getSettings(session.userId));
  },
};