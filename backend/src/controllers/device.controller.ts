import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { MessageResponseDto } from "../models/auth.dto";
import { deviceService } from "../services/device.service";
import { validateDeviceToken, validateRegisterDevice } from "../utils/device.validators";

export const deviceController = {
  // La app llama esto al iniciar sesión con el Expo push token del celular
  async register(req: Request, res: Response<MessageResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const { token, platform } = validateRegisterDevice(req.body);
    await deviceService.register(session.userId, token, platform);
    res.status(201).json({ message: "Dispositivo registrado" });
  },

  // La app llama esto al cerrar sesión
  async unregister(req: Request, res: Response<MessageResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const token = validateDeviceToken(req.body);
    await deviceService.unregister(session.userId, token);
    res.status(200).json({ message: "Dispositivo eliminado" });
  },
};
