import { db } from "../config/firebase";
import {
  ProfileResponseDto,
  UpdateProfileDto,
  UpdateProfileResponseDto,
} from "../models/profile.dto";
import { Profile } from "../models/profile.model";
import { authService } from "./auth.service";
import { connectionService } from "./connection.service";
import { subjectService } from "./subject.service";

// Perfiles académicos en Firestore: `profiles/{uid}`.
// Si el usuario aún no tiene perfil se responden valores por defecto (leer no escribe nada);
// el documento se crea la primera vez que se actualiza.
const profilesCol = db.collection("profiles");

const defaults = (userId: string): Profile => ({
  userId,
  career: "",
  semester: 1,
  university: "",
  interests: [],
});

// bio y avatarUrl se guardan como null cuando no hay valor (Firestore ignora undefined)
const fromDoc = (userId: string, d: FirebaseFirestore.DocumentData | undefined): Profile => {
  if (!d) return defaults(userId);
  return {
    userId,
    bio: d.bio ?? undefined,
    career: String(d.career ?? ""),
    semester: Number(d.semester ?? 1),
    university: String(d.university ?? ""),
    avatarUrl: d.avatarUrl ?? undefined,
    interests: Array.isArray(d.interests) ? d.interests : [],
  };
};

const toDoc = (p: Profile) => ({
  bio: p.bio ?? null,
  career: p.career,
  semester: p.semester,
  university: p.university,
  avatarUrl: p.avatarUrl ?? null,
  interests: p.interests,
});

const loadProfile = async (userId: string): Promise<Profile> =>
  fromDoc(userId, (await profilesCol.doc(userId).get()).data());

const buildProfileResponse = async (userId: string, profile?: Profile): Promise<ProfileResponseDto> => {
  const [user, current, subjects, connections] = await Promise.all([
    authService.getProfile(userId), // lanza 404 si el usuario no existe
    profile ?? loadProfile(userId),
    subjectService.countSubjects(userId),
    connectionService.countConnections(userId),
  ]);

  return {
    id: String(user.id),
    name: user.name,
    bio: current.bio, // si es undefined, JSON lo omite (bio es opcional)
    career: current.career,
    semester: current.semester,
    university: current.university,
    avatarUrl: current.avatarUrl,
    interests: [...current.interests],
    stats: { subjects, connections },
  };
};

export const profileService = {
  // Datos académicos de varios usuarios, para módulos como conexiones.
  // No crea perfiles: leer no modifica nada
  async getAcademicInfoMany(
    userIds: string[],
  ): Promise<Map<string, Pick<Profile, "career" | "semester" | "avatarUrl">>> {
    const unique = [...new Set(userIds)];
    const profiles = await Promise.all(unique.map((id) => loadProfile(id)));
    return new Map(
      profiles.map((p) => [p.userId, { career: p.career, semester: p.semester, avatarUrl: p.avatarUrl }]),
    );
  },

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    return buildProfileResponse(userId);
  },

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UpdateProfileResponseDto> {
    const profile = await loadProfile(userId);

    // Primero lo que puede fallar (el usuario podría no existir): así, si falla,
    // no queda el perfil a medio actualizar
    if (dto.name !== undefined) await authService.updateName(userId, dto.name);

    // Solo se tocan los campos que llegaron: eso es una actualización parcial
    if (dto.bio !== undefined) profile.bio = dto.bio || undefined; // "" borra la bio
    if (dto.career !== undefined) profile.career = dto.career;
    if (dto.semester !== undefined) profile.semester = dto.semester;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.interests !== undefined) profile.interests = dto.interests;

    await profilesCol.doc(userId).set(toDoc(profile));

    return { message: "Perfil actualizado", profile: await buildProfileResponse(userId, profile) };
  },
};
