import { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase";
import { UserRole } from "../models/user.model";
import { authService } from "../services/auth.service";
import { HttpError } from "../utils/http-error";

// Datos de autenticación que el middleware deja en res.locals.
// `userId` es el UID de Firebase.
export interface AuthSession {
  userId: string;
  email: string | null;
  role: UserRole; // se lee de users/{uid} al validar el token (lo usa requireRole)
}

export interface AuthLocals {
  session: AuthSession;
}

const errorCode = (err: unknown): string =>
  typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";

// Verifica el ID token de Firebase que envía la app: Authorization: Bearer <idToken>
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Falta el header Authorization: Bearer <idToken de Firebase>");
  }
  const idToken = header.slice("Bearer ".length).trim();

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch (err) {
    if (errorCode(err) === "auth/id-token-expired") throw new HttpError(401, "La sesión ha expirado");
    throw new HttpError(401, "Token inválido");
  }

  const user = await authService.ensureUser(decoded);
  (res.locals as AuthLocals).session = { userId: decoded.uid, email: decoded.email ?? null, role: user.role };
  next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    const { session } = res.locals as AuthLocals;
    if (!roles.includes(session.role)) {
      throw new HttpError(403, "No tienes permisos para esta acción");
    }
    next();
  };
