import type { DecodedIdToken } from "firebase-admin/auth";
import { config } from "../config/env";
import { db } from "../config/firebase";
import { PublicUser, User, UserRole, toPublicUser } from "../models/user.model";
import { HttpError } from "../utils/http-error";
import { toDateOrNow } from "../utils/firestore";

// Usuarios en Firestore: colección `users/{uid}`.
// Todos los módulos ya leen Firestore de forma asíncrona, así que no hay caché en memoria.

const usersCol = db.collection("users");

const fromDoc = (id: string, data: FirebaseFirestore.DocumentData): User => ({
  id,
  name: String(data.name ?? ""),
  email: String(data.email ?? ""),
  photoUrl: (data.photoUrl as string | null) ?? null,
  role: (data.role as UserRole) ?? "student",
  createdAt: toDateOrNow(data.createdAt),
});

const roleFor = (email: string, current?: UserRole): UserRole =>
  config.adminEmails.includes(email.toLowerCase()) ? "admin" : (current ?? "student");

export const authService = {
  // Se llama en cada petición autenticada: crea el usuario la primera vez que entra
  async ensureUser(token: DecodedIdToken): Promise<User> {
    const ref = usersCol.doc(token.uid);
    const snap = await ref.get();
    const email = token.email ?? "";

    if (snap.exists) {
      const user = fromDoc(snap.id, snap.data() ?? {});
      const role = roleFor(email, user.role);
      if (role !== user.role) {
        user.role = role;
        await ref.set({ role }, { merge: true });
      }
      return user;
    }

    const user: User = {
      id: token.uid,
      name: (token.name as string | undefined) || email.split("@")[0] || "Estudiante",
      email,
      photoUrl: (token.picture as string | undefined) ?? null,
      role: roleFor(email),
      createdAt: new Date(),
    };
    const { id: _id, ...data } = user;
    await ref.set(data);
    return user;
  },

  async getProfile(userId: string): Promise<PublicUser> {
    const snap = await usersCol.doc(userId).get();
    if (!snap.exists) throw new HttpError(404, "Usuario no encontrado");
    return toPublicUser(fromDoc(snap.id, snap.data() ?? {}));
  },

  // Varios usuarios por id (para mostrar nombres en conexiones y grupos).
  // Los que no existen simplemente no aparecen en el mapa.
  async getUsersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
    const unique = [...new Set(ids)];
    const snaps = await Promise.all(unique.map((id) => usersCol.doc(id).get()));
    const users = new Map<string, PublicUser>();
    for (const snap of snaps) {
      if (snap.exists) users.set(snap.id, toPublicUser(fromDoc(snap.id, snap.data() ?? {})));
    }
    return users;
  },

  // Cambia el nombre visible (lo usa PATCH /api/profile). 404 si el usuario no existe.
  async updateName(userId: string, name: string): Promise<void> {
    const ref = usersCol.doc(userId);
    if (!(await ref.get()).exists) throw new HttpError(404, "Usuario no encontrado");
    await ref.set({ name }, { merge: true });
  },

  async listUsers(): Promise<PublicUser[]> {
    const snap = await usersCol.get();
    return snap.docs.map((doc) => toPublicUser(fromDoc(doc.id, doc.data() ?? {})));
  },
};
