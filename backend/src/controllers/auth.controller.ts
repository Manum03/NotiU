import { Request, Response } from "express";
import { PublicUser } from "../models/user.model";
import { AuthLocals } from "../middlewares/auth.middleware";
import { authService } from "../services/auth.service";

// Registro, login, logout y cambio de contraseña se hacen en la app con el SDK de
// Firebase Auth. El backend solo valida el ID token y expone el usuario.
export const authController = {
  async me(_req: Request, res: Response<PublicUser>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(await authService.getProfile(session.userId));
  },

  async listUsers(_req: Request, res: Response<PublicUser[]>): Promise<void> {
    res.status(200).json(await authService.listUsers());
  },
};
