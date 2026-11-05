import {
  ProfileResponseDto,
  UpdateProfileDto,
  UpdateProfileResponseDto,
} from "../models/profile.dto";
import { Profile } from "../models/profile.model";
import { authService } from "./auth.service";

// ---- "Base de datos" en memoria (se reinicia al reiniciar el servidor) ----
const profiles: Profile[] = [];

// Si el usuario aún no tiene perfil, se crea uno con valores por defecto
const getOrCreateProfile = (userId: number): Profile => {
  let profile = profiles.find((p) => p.userId === userId);
  if (!profile) {
    profile = { userId, career: "", semester: 1, university: "", interests: [] };
    profiles.push(profile);
  }
  return profile;
};

const buildProfileResponse = (userId: number): ProfileResponseDto => {
  const user = authService.getProfile(userId); // lanza 404 si el usuario no existe
  const profile = getOrCreateProfile(userId);

  return {
    id: String(user.id),
    name: user.name,
    bio: profile.bio, // si es undefined, JSON lo omite (bio es opcional)
    career: profile.career,
    semester: profile.semester,
    university: profile.university,
    avatarUrl: profile.avatarUrl,
    interests: [...profile.interests],
    // TODO: calcular con los módulos de materias y conexiones cuando existan
    stats: { subjects: 0, connections: 0 },
  };
};

export const profileService = {
  getProfile(userId: number): ProfileResponseDto {
    return buildProfileResponse(userId);
  },

  updateProfile(userId: number, dto: UpdateProfileDto): UpdateProfileResponseDto {
    const profile = getOrCreateProfile(userId);

    // Primero lo que puede fallar (el usuario podría no existir): así, si falla,
    // no queda el perfil a medio actualizar
    if (dto.name !== undefined) authService.updateName(userId, dto.name);

    // Solo se tocan los campos que llegaron: eso es una actualización parcial
    if (dto.bio !== undefined) profile.bio = dto.bio || undefined; // "" borra la bio
    if (dto.career !== undefined) profile.career = dto.career;
    if (dto.semester !== undefined) profile.semester = dto.semester;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.interests !== undefined) profile.interests = dto.interests;

    return { message: "Perfil actualizado", profile: buildProfileResponse(userId) };
  },
};