import { randomBytes } from "node:crypto";
import { config } from "../config/env";
import { AuthResponseDto, ChangePasswordDto, LoginDto, RegisterDto } from "../models/auth.dto";
import { Session } from "../models/session.model";
import { PublicUser, User, toPublicUser } from "../models/user.model";
import { HttpError } from "../utils/http-error";
import { hashPassword, verifyPassword } from "../utils/password";

// ---- "Base de datos" en memoria (se reinicia al reiniciar el servidor) ----
const users: User[] = [];
const sessions: Session[] = [];
let nextUserId = 1;

const createUser = (dto: RegisterDto): User => {
  const user: User = {
    id: nextUserId++,
    name: dto.name,
    email: dto.email,
    passwordHash: hashPassword(dto.password),
    role: dto.role ?? "student",
    createdAt: new Date(),
  };
  users.push(user);
  return user;
};

// Usuario de prueba para poder hacer login sin registrarse
createUser({ name: "Admin NotiU", email: "admin@notiu.com", password: "admin1234", role: "admin" });

const createSession = (userId: number): Session => {
  const now = new Date();
  const session: Session = {
    token: randomBytes(32).toString("hex"),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + config.sessionTtlMs),
  };
  sessions.push(session);
  return session;
};

const toAuthResponse = (user: User, session: Session): AuthResponseDto => ({
  token: session.token,
  expiresAt: session.expiresAt.toISOString(),
  user: toPublicUser(user),
});

const findUserById = (id: number): User => {
  const user = users.find((u) => u.id === id);
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return user;
};

export const authService = {
  register(dto: RegisterDto): AuthResponseDto {
    if (users.some((u) => u.email === dto.email)) {
      throw new HttpError(409, "Ya existe un usuario con ese email");
    }
    const user = createUser(dto);
    return toAuthResponse(user, createSession(user.id));
  },

  login(dto: LoginDto): AuthResponseDto {
    const user = users.find((u) => u.email === dto.email);
    // Mismo mensaje en ambos casos para no revelar qué emails existen
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new HttpError(401, "Email o contraseña incorrectos");
    }
    return toAuthResponse(user, createSession(user.id));
  },

  // Devuelve la sesión si el token existe y no ha expirado
  validateToken(token: string): Session {
    const index = sessions.findIndex((s) => s.token === token);
    if (index === -1) throw new HttpError(401, "Token inválido");

    const session = sessions[index];
    if (session.expiresAt.getTime() < Date.now()) {
      sessions.splice(index, 1);
      throw new HttpError(401, "La sesión ha expirado");
    }
    return session;
  },

  logout(token: string): void {
    const index = sessions.findIndex((s) => s.token === token);
    if (index !== -1) sessions.splice(index, 1);
  },

  getProfile(userId: number): PublicUser {
    return toPublicUser(findUserById(userId));
  },

  changePassword(userId: number, currentToken: string, dto: ChangePasswordDto): void {
    const user = findUserById(userId);
    if (!verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new HttpError(401, "La contraseña actual es incorrecta");
    }
    user.passwordHash = hashPassword(dto.newPassword);

    // Cierra las demás sesiones del usuario, conserva la actual
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (sessions[i].userId === userId && sessions[i].token !== currentToken) {
        sessions.splice(i, 1);
      }
    }
  },

  listUsers(): PublicUser[] {
    return users.map(toPublicUser);
  },
};
