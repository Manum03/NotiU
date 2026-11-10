export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_MEMBERS = 50;

export type StudyGroupRole = "admin" | "member";

export interface StudyGroupMember {
  userId: number;
  role: StudyGroupRole;
  joinedAt: Date;
}

// Los grupos son públicos: cualquier estudiante autenticado puede verlos y unirse
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subjectName: string;
  creatorId: number;
  maxMembers: number;
  schedule?: string; // texto libre, por ejemplo "Martes 18:00"
  meetingLink?: string;
  members: StudyGroupMember[]; // ordenados por antigüedad (el primero es el más antiguo)
  createdAt: Date;
}
