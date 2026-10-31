import { Request, Response } from "express";
import { AuthResponseDto, MessageResponseDto } from "../models/auth.dto";
import { PublicUser } from "../models/user.model";
import { AuthLocals } from "../middlewares/auth.middleware";
import { authService } from "../services/auth.service";
import { validateChangePassword, validateLogin, validateRegister } from "../utils/validators";

export const authController = {
  register(req: Request, res: Response<AuthResponseDto>): void {
    const dto = validateRegister(req.body);
    res.status(201).json(authService.register(dto));
  },

  login(req: Request, res: Response<AuthResponseDto>): void {
    const dto = validateLogin(req.body);
    res.status(200).json(authService.login(dto));
  },

  logout(_req: Request, res: Response<MessageResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    authService.logout(session.token);
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  },

  me(_req: Request, res: Response<PublicUser>): void {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(authService.getProfile(session.userId));
  },

  changePassword(req: Request, res: Response<MessageResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateChangePassword(req.body);
    authService.changePassword(session.userId, session.token, dto);
    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  },

  listUsers(_req: Request, res: Response<PublicUser[]>): void {
    res.status(200).json(authService.listUsers());
  },
};
