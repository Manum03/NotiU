export interface ProfileResponseDto {
  id: string;
  name: string;
  bio?: string;
  career: string;
  semester: number;
  university: string;
  avatarUrl?: string;
  interests: string[];
  stats: {
    subjects: number;
    connections: number;
  };
}

// Todos los campos son opcionales: PATCH = actualización parcial
export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  career?: string;
  semester?: number;
  avatarUrl?: string;
  interests?: string[];
}

export interface UpdateProfileResponseDto {
  message: string;
  profile: ProfileResponseDto;
}