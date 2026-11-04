import { ProfileResponseDto } from "../models/profile.dto";
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

export const profileService = {
  getProfile(userId: number): ProfileResponseDto {
    const user = authService.getProfile(userId); // lanza 404 si el usuario no existe
    const profile = getOrCreateProfile(userId);

    return {
      id: String(user.id),
      name: user.name,
      bio: profile.bio, // si es undefined, JSON lo omite (bio es opcional)
      career: profile.career,
      semester: profile.semester,
      university: profile.university,
      interests: [...profile.interests],
      // TODO: calcular con los módulos de materias y conexiones cuando existan
      stats: { subjects: 0, connections: 0 },
    };
  },
};