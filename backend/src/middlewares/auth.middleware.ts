import { NextFunction, Request, Response } from "express";
import { Session } from "../models/session.model";
import { UserRole } from "../models/user.model";
import { authService } from "../services/auth.service";
import { HttpError } from "../utils/http-error";

// Datos de autenticación que el middleware deja en res.locals
export interface AuthLocals {
  session: Session;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Falta el header Authorization: Bearer <token>");
  }
  const token = header.slice("Bearer ".length).trim();
  (res.locals as AuthLocals).session = authService.validateToken(token);
  next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    const { session } = res.locals as AuthLocals;
    const user = authService.getProfile(session.userId);
    if (!roles.includes(user.role)) {
      throw new HttpError(403, "No tienes permisos para esta acción");
    }
    next();
  };
