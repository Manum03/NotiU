import { randomUUID } from "node:crypto";
import { db } from "../config/firebase";
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
import { toDateOrNow } from "../utils/firestore";
import { fold } from "../utils/text";
import { authService } from "./auth.service";

// Grupos de estudio en Firestore: `studyGroups/{groupId}`.
// `memberIds` repite los ids de `members` para consultar "mis grupos" con array-contains.
const groupsCol = db.collection("studyGroups");

const fromDoc = (id: string, d: FirebaseFirestore.DocumentData): StudyGroup => ({
  id,
  name: String(d.name ?? ""),
  description: String(d.description ?? ""),
  subjectName: String(d.subjectName ?? ""),
  creatorId: String(d.creatorId ?? ""),
  maxMembers: Number(d.maxMembers ?? 0),
  schedule: d.schedule ?? undefined,
  meetingLink: d.meetingLink ?? undefined,
  members: (Array.isArray(d.members) ? d.members : []).map((m: FirebaseFirestore.DocumentData) => ({
    userId: String(m.userId),
    role: m.role,
    joinedAt: toDateOrNow(m.joinedAt),
  })),
  createdAt: toDateOrNow(d.createdAt),
});

const toDoc = ({ id: _id, ...rest }: StudyGroup) => ({
  ...rest,
  memberIds: rest.members.map((m) => m.userId),
});

const isMember = (group: StudyGroup, userId: string): boolean =>
  group.members.some((m) => m.userId === userId);

const toListItem = (g: StudyGroup, userId: string): StudyGroupListItemDto => ({
  id: g.id,
  name: g.name,
  subjectName: g.subjectName,
  membersCount: g.members.length,
  maxMembers: g.maxMembers,
  availableSpots: g.maxMembers - g.members.length,
  nextSession: g.schedule,
  isMember: isMember(g, userId),
});

const findGroup = async (groupId: string): Promise<StudyGroup> => {
  const snap = await groupsCol.doc(groupId).get();
  if (!snap.exists) throw new HttpError(404, "Grupo no encontrado");
  return fromDoc(snap.id, snap.data() ?? {});
};

export const studyGroupService = {
  async listGroups(userId: string, filters: ListStudyGroupsFilters): Promise<ListStudyGroupsResponseDto> {
    const subject = filters.subject ? fold(filters.subject) : undefined;
    const term = filters.search ? fold(filters.search) : undefined;

    // "Solo mis grupos" se consulta en Firestore; los demás filtros, en memoria
    const snap = filters.onlyMine
      ? await groupsCol.where("memberIds", "array-contains", userId).get()
      : await groupsCol.get();

    const data = snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((g) => subject === undefined || fold(g.subjectName).includes(subject))
      .filter(
        (g) => term === undefined || fold(g.name).includes(term) || fold(g.description).includes(term),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((g) => toListItem(g, userId));

    return { data };
  },

  async getGroup(groupId: string): Promise<StudyGroupDetailDto> {
    const group = await findGroup(groupId);
    const users = await authService.getUsersByIds(group.members.map((m) => m.userId));
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
        name: users.get(m.userId)?.name ?? "Usuario",
        role: m.role,
      })),
      meetingLink: group.meetingLink,
    };
  },

  async createGroup(userId: string, dto: CreateStudyGroupDto): Promise<CreateStudyGroupResponseDto> {
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
    await groupsCol.doc(group.id).set(toDoc(group));

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

  // En transacción: dos estudiantes que se unen a la vez no pueden pasarse del cupo
  async joinGroup(userId: string, groupId: string): Promise<JoinStudyGroupResponseDto> {
    const ref = groupsCol.doc(groupId);
    const group = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, "Grupo no encontrado");
      const current = fromDoc(snap.id, snap.data() ?? {});
      if (isMember(current, userId)) {
        throw new HttpError(409, "Ya eres miembro de este grupo");
      }
      if (current.members.length >= current.maxMembers) {
        throw new HttpError(400, "El grupo ya alcanzó el cupo máximo");
      }
      current.members.push({ userId, role: "member", joinedAt: new Date() });
      tx.set(ref, toDoc(current));
      return current;
    });

    return {
      message: "Te has unido al grupo de estudio",
      groupId: group.id,
      membersCount: group.members.length,
    };
  },

  async leaveGroup(userId: string, groupId: string): Promise<LeaveStudyGroupResponseDto> {
    const ref = groupsCol.doc(groupId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, "Grupo no encontrado");
      const group = fromDoc(snap.id, snap.data() ?? {});
      const index = group.members.findIndex((m) => m.userId === userId);
      if (index === -1) throw new HttpError(400, "No perteneces a este grupo");

      const [leaving] = group.members.splice(index, 1);

      if (group.members.length === 0) {
        // Nadie queda en el grupo: se cierra
        tx.delete(ref);
        return;
      }
      if (leaving.role === "admin" && !group.members.some((m) => m.role === "admin")) {
        // Sale el administrador: el rol pasa al miembro más antiguo
        group.members[0].role = "admin";
      }
      tx.set(ref, toDoc(group));
    });

    return { message: "Has salido del grupo de estudio", groupId };
  },
};
