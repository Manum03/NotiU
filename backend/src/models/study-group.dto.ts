import { StudyGroupRole } from "./study-group.model";

// ---- Listado (GET /api/study-groups) ----
export interface ListStudyGroupsFilters {
  subject?: string;
  search?: string;
  onlyMine?: boolean;
}

export interface StudyGroupListItemDto {
  id: string;
  name: string;
  subjectName: string;
  membersCount: number;
  maxMembers: number;
  availableSpots: number;
  nextSession?: string;
  isMember: boolean;
}

export interface ListStudyGroupsResponseDto {
  data: StudyGroupListItemDto[];
}
// ---- Detalle (GET /api/study-groups/:groupId) ----
export interface StudyGroupMemberDto {
  id: string;
  name: string;
  role: StudyGroupRole;
}

export interface StudyGroupDetailDto {
  id: string;
  name: string;
  description: string;
  subjectName: string;
  creatorId: string;
  maxMembers: number;
  schedule?: string;
  members: StudyGroupMemberDto[];
  meetingLink?: string;
}
// ---- Creación (POST /api/study-groups) ----
export interface CreateStudyGroupDto {
  name: string;
  subjectName: string;
  description: string;
  maxMembers: number;
  schedule?: string;
  meetingLink?: string;
}

export interface CreateStudyGroupResponseDto {
  message: string;
  group: {
    id: string;
    name: string;
    subjectName: string;
    membersCount: number;
  };
}
// ---- Unirse (POST /api/study-groups/:groupId/join) ----
export interface JoinStudyGroupResponseDto {
  message: string;
  groupId: string;
  membersCount: number;
}
// ---- Salir (DELETE /api/study-groups/:groupId/leave) ----
export interface LeaveStudyGroupResponseDto {
  message: string;
  groupId: string;
}
