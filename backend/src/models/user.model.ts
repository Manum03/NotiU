export type UserRole = "student" | "teacher" | "admin";

// El id es el UID de Firebase Authentication. La contraseña la gestiona Firebase:
// el backend nunca la ve ni la guarda.
export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: UserRole;
  createdAt: Date;
}

export type PublicUser = User;

export const toPublicUser = (user: User): PublicUser => ({ ...user });
