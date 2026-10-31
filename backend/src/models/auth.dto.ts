import { PublicUser, UserRole } from "./user.model";

// ---- Request DTOs ----
export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ---- Response DTOs ----
export interface AuthResponseDto {
  token: string;
  expiresAt: string;
  user: PublicUser;
}

export interface MessageResponseDto {
  message: string;
}

export interface ErrorResponseDto {
  error: string;
  details?: string[];
}
