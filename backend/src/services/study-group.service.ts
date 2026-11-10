import { randomUUID } from "node:crypto";
import {
  CreateStudyGroupDto,
  CreateStudyGroupResponseDto,
  JoinStudyGroupResponseDto,
  LeaveStudyGroupResponseDto,
  ListStudyGroupsFilters,
  ListStudyGroupsResponseDto,
  StudyGroupDetailDto,
  StudyGroupListItemDto,
} from "../models/study-group.dto";
import { StudyGroup } from "../models/study-group.model";
import { HttpError } from "../utils/http-error";
import { fold } from "../utils/text";
import { authService } from "./auth.service";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor
const groups: StudyGroup[] = [];

const isMember = (group: StudyGroup, userId: number): boolean =>
  group.members.some((m) => m.userId === userId);

const toListItem = (g: StudyGroup, userId: number): StudyGroupListItemDto => ({
  id: g.id,
  name: g.name,
  subjectName: g.subjectName,
  membersCount: g.members.length,
  maxMembers: g.maxMembers,
  availableSpots: g.maxMembers - g.members.length,
  nextSession: g.schedule,
  isMember: isMember(g, userId),
});

const findGroup = (groupId: string): StudyGroup => {
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new HttpError(404, "Grupo no encontrado");
  return group;
};

export const studyGroupService = {
  listGroups(userId: number, filters: ListStudyGroupsFilters): ListStudyGroupsResponseDto {
    const subject = filters.subject ? fold(filters.subject) : undefined;
    const term = filters.search ? fold(filters.search) : undefined;

    const data = groups
      .filter((g) => !filters.onlyMine || isMember(g, userId))
      .filter((g) => subject === undefined || fold(g.subjectName).includes(subject))
      .filter(
        (g) => term === undefined || fold(g.name).includes(term) || fold(g.description).includes(term),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((g) => toListItem(g, userId));

    return { data };
  },

  getGroup(groupId: string): StudyGroupDetailDto {
    const group = findGroup(groupId);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      subjectName: group.subjectName,
      creatorId: String(group.creatorId),
      maxMembers: group.maxMembers,
      schedule: group.schedule,
      members: group.members.map((m) => ({
        id: String(m.userId),
        name: authService.getProfile(m.userId).name,
        role: m.role,
      })),
      meetingLink: group.meetingLink,
    };
  },

  createGroup(userId: number, dto: CreateStudyGroupDto): CreateStudyGroupResponseDto {
    const now = new Date();
    const group: StudyGroup = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      subjectName: dto.subjectName,
      creatorId: userId, // viene del token, nunca del body
      maxMembers: dto.maxMembers,
      schedule: dto.schedule,
      meetingLink: dto.meetingLink,
      // El creador queda automáticamente como administrador y primer miembro
      members: [{ userId, role: "admin", joinedAt: now }],
      createdAt: now,
    };
    groups.push(group);

    return {
      message: "Grupo de estudio creado",
      group: {
        id: group.id,
        name: group.name,
        subjectName: group.subjectName,
        membersCount: group.members.length,
      },
    };
  },

  joinGroup(userId: number, groupId: string): JoinStudyGroupResponseDto {
    const group = findGroup(groupId);
    if (isMember(group, userId)) {
      throw new HttpError(409, "Ya eres miembro de este grupo");
    }
    if (group.members.length >= group.maxMembers) {
      throw new HttpError(400, "El grupo ya alcanzó el cupo máximo");
    }

    group.members.push({ userId, role: "member", joinedAt: new Date() });
    return {
      message: "Te has unido al grupo de estudio",
      groupId: group.id,
      membersCount: group.members.length,
    };
  },

  leaveGroup(userId: number, groupId: string): LeaveStudyGroupResponseDto {
    const group = findGroup(groupId);
    const index = group.members.findIndex((m) => m.userId === userId);
    if (index === -1) throw new HttpError(400, "No perteneces a este grupo");

    const [leaving] = group.members.splice(index, 1);

    if (group.members.length === 0) {
      // Nadie queda en el grupo: se cierra
      groups.splice(groups.indexOf(group), 1);
    } else if (leaving.role === "admin" && !group.members.some((m) => m.role === "admin")) {
      // Sale el administrador: el rol pasa al miembro más antiguo
      group.members[0].role = "admin";
    }

    return { message: "Has salido del grupo de estudio", groupId: group.id };
  },
};
