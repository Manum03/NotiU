export type UserRole = "student" | "teacher" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

// Lo que se devuelve al cliente: nunca incluye el hash de la contraseña
export type PublicUser = Omit<User, "passwordHash">;

export const toPublicUser = ({ passwordHash, ...rest }: User): PublicUser => rest;
