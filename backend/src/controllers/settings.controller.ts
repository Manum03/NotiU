import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { SettingsResponseDto, UpdateSettingsResponseDto } from "../models/settings.dto";
import { settingsService } from "../services/settings.service";
import { reminderService } from "../services/reminder.service";
import { validateUpdateSettings } from "../utils/validators";

export const settingsController = {
  async get(_req: Request, res: Response<SettingsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(await settingsService.getSettings(session.userId));
  },

  async update(req: Request, res: Response<UpdateSettingsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateUpdateSettings(req.body); // valida y filtra el body
    const result = await settingsService.updateSettings(session.userId, dto);
    // Si cambiaron los tiempos de recordatorio, se reprograman las tareas pendientes
    if (dto.reminders?.offsetsMinutes) {
      await reminderService.rescheduleAllForUser(session.userId);
    }
    res.status(200).json(result);
  },
};
