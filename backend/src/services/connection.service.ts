import { randomUUID } from "node:crypto";
import { db } from "../config/firebase";
import {
  ConnectionPeerDto,
  CreateConnectionRequestDto,
  CreateConnectionRequestResponseDto,
  DeleteConnectionResponseDto,
  ListConnectionsFilters,
  ListConnectionsResponseDto,
  ListPeersFilters,
  ListPeersResponseDto,
  PeerConnectionStatus,
  PeerDto,
  RespondConnectionRequestDto,
  RespondConnectionRequestResponseDto,
} from "../models/connection.dto";
import { Connection } from "../models/connection.model";
import { HttpError } from "../utils/http-error";
import { toDate, toDateOrNow } from "../utils/firestore";
import { fold, normalize } from "../utils/text";
import { authService } from "./auth.service";
import { profileService } from "./profile.service";
import { settingsService } from "./settings.service";
import { subjectService } from "./subject.service";

// Conexiones en Firestore: `connections/{id}` con requesterId, targetId y
// participants: [a, b] para consultar las de un usuario con array-contains.
const connectionsCol = db.collection("connections");

const fromDoc = (id: string, d: FirebaseFirestore.DocumentData): Connection => ({
  id,
  requesterId: String(d.requesterId ?? ""),
  targetId: String(d.targetId ?? ""),
  message: String(d.message ?? ""),
  status: d.status ?? "pending",
  createdAt: toDateOrNow(d.createdAt),
  respondedAt: toDate(d.respondedAt),
});

const toDoc = ({ id: _id, ...rest }: Connection) => ({
  ...rest,
  participants: [rest.requesterId, rest.targetId],
});

// Todas las conexiones/solicitudes donde participa el usuario (consulta de un campo)
const connectionsOf = async (userId: string): Promise<Connection[]> => {
  const snap = await connectionsCol.where("participants", "array-contains", userId).get();
  return snap.docs.map((doc) => fromDoc(doc.id, doc.data()));
};

const involves = (c: Connection, userId: string): boolean =>
  c.requesterId === userId || c.targetId === userId;

const otherUserId = (c: Connection, userId: string): string =>
  c.requesterId === userId ? c.targetId : c.requesterId;

// Solicitud pendiente o conexión aceptada entre dos usuarios (en cualquier dirección).
// Las rechazadas no cuentan: se puede volver a enviar una solicitud
const findActiveBetween = async (a: string, b: string): Promise<Connection | undefined> =>
  activeWith(await connectionsOf(a), a, b);

// Igual que findActiveBetween, pero sobre las conexiones de `a` ya cargadas
const activeWith = (mine: Connection[], a: string, b: string): Connection | undefined =>
  mine.find((c) => c.status !== "rejected" && involves(c, a) && involves(c, b));

const toPeerStatus = (c: Connection | undefined): PeerConnectionStatus => {
  if (!c) return "none";
  return c.status === "accepted" ? "connected" : "pending";
};

// Nombre y datos académicos de los otros participantes (una lectura por usuario)
const loadPeers = async (userIds: string[]): Promise<Map<string, ConnectionPeerDto>> => {
  const [users, infos] = await Promise.all([
    authService.getUsersByIds(userIds),
    profileService.getAcademicInfoMany(userIds),
  ]);
  const peers = new Map<string, ConnectionPeerDto>();
  for (const id of userIds) {
    const info = infos.get(id);
    peers.set(id, {
      id: String(id),
      name: users.get(id)?.name ?? "Usuario",
      career: info?.career ?? "",
      avatarUrl: info?.avatarUrl,
    });
  }
  return peers;
};

const findConnection = async (id: string, notFoundMessage: string): Promise<Connection> => {
  const snap = await connectionsCol.doc(id).get();
  if (!snap.exists) throw new HttpError(404, notFoundMessage);
  return fromDoc(snap.id, snap.data() ?? {});
};

export const connectionService = {
  // La usa GET /api/profile para las estadísticas del perfil
  async countConnections(userId: string): Promise<number> {
    return (await connectionsOf(userId)).filter((c) => c.status === "accepted").length;
  },

  async listPeers(userId: string, filters: ListPeersFilters): Promise<ListPeersResponseDto> {
    const career = filters.career ? fold(filters.career) : undefined;
    const code = filters.subjectCode ? normalize(filters.subjectCode) : undefined;
    const term = filters.search ? fold(filters.search) : undefined;

    // Códigos de las materias del usuario, para calcular las materias en común
    const [mySubjects, users, mine] = await Promise.all([
      subjectService.getOwnedSubjects(userId),
      authService.listUsers(),
      connectionsOf(userId),
    ]);
    const myCodes = new Set(mySubjects.map((s) => normalize(s.code)));

    const others = users.filter((u) => u.id !== userId); // nunca el propio usuario
    // Ajustes, perfiles y materias de los demás se leen en paralelo
    const [settings, infos, subjectsByUser] = await Promise.all([
      Promise.all(others.map((u) => settingsService.getSettings(u.id))),
      profileService.getAcademicInfoMany(others.map((u) => u.id)),
      Promise.all(others.map((u) => subjectService.getOwnedSubjects(u.id))),
    ]);

    const filtered: PeerDto[] = [];
    for (const [i, user] of others.entries()) {
      // Ajuste de privacidad: si el estudiante no quiere aparecer, se omite
      if (!settings[i].privacy.showProfileToPeers) continue;

      const info = infos.get(user.id) ?? { career: "", semester: 1 };
      const peerSubjects = subjectsByUser[i];

      if (career !== undefined && !fold(info.career).includes(career)) continue;
      if (code !== undefined && !peerSubjects.some((s) => normalize(s.code) === code)) continue;
      if (term !== undefined && !fold(user.name).includes(term)) continue;

      filtered.push({
        id: String(user.id),
        name: user.name,
        career: info.career,
        semester: info.semester,
        sharedSubjects: peerSubjects.filter((s) => myCodes.has(normalize(s.code))).map((s) => s.name),
        connectionStatus: toPeerStatus(activeWith(mine, userId, user.id)),
      });
    }

    // Primero los que comparten más materias; luego por nombre
    filtered.sort(
      (a, b) =>
        b.sharedSubjects.length - a.sharedSubjects.length || a.name.localeCompare(b.name, "es"),
    );

    const total = filtered.length;
    const start = (filters.page - 1) * filters.limit;

    return {
      data: filtered.slice(start, start + filters.limit),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async listConnections(userId: string, filters: ListConnectionsFilters): Promise<ListConnectionsResponseDto> {
    // Solo las conexiones donde el usuario es solicitante o receptor
    const mine = (await connectionsOf(userId)).filter((c) => c.status !== "rejected");
    const peers = await loadPeers(mine.map((c) => otherUserId(c, userId)));
    const peerOf = (c: Connection): ConnectionPeerDto => peers.get(otherUserId(c, userId))!;

    const accepted =
      filters.status === "pending"
        ? []
        : mine
            .filter((c) => c.status === "accepted")
            .map((c) => ({
              connectionId: c.id,
              peer: peerOf(c),
              since: (c.respondedAt ?? c.createdAt).toISOString(),
            }));

    const pending =
      filters.status === "accepted"
        ? []
        : mine
            .filter((c) => c.status === "pending")
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((c) => ({
              requestId: c.id,
              direction: c.requesterId === userId ? ("sent" as const) : ("received" as const),
              peer: peerOf(c),
              message: c.message,
              createdAt: c.createdAt.toISOString(),
            }));

    return { connections: accepted, pendingRequests: pending };
  },

  async createRequest(
    userId: string,
    dto: CreateConnectionRequestDto,
  ): Promise<CreateConnectionRequestResponseDto> {
    if (dto.targetUserId === userId) {
      throw new HttpError(400, "No puedes enviarte una solicitud a ti mismo");
    }
    await authService.getProfile(dto.targetUserId); // 404 si el destinatario no existe

    const existing = await findActiveBetween(userId, dto.targetUserId);
    if (existing?.status === "accepted") {
      throw new HttpError(409, "Ya estás conectado con este usuario");
    }
    if (existing) {
      throw new HttpError(409, "Ya existe una solicitud pendiente con este usuario");
    }

    const request: Connection = {
      id: randomUUID(),
      requesterId: userId, // viene del token, nunca del body
      targetId: dto.targetUserId,
      message: dto.message ?? "",
      status: "pending",
      createdAt: new Date(),
      respondedAt: null,
    };
    await connectionsCol.doc(request.id).set(toDoc(request));

    return {
      message: "Solicitud enviada",
      request: {
        id: request.id,
        targetUserId: String(request.targetId),
        status: "pending",
        createdAt: request.createdAt.toISOString(),
      },
    };
  },

  async respondRequest(
    userId: string,
    requestId: string,
    dto: RespondConnectionRequestDto,
  ): Promise<RespondConnectionRequestResponseDto> {
    const request = await findConnection(requestId, "Solicitud no encontrada");
    if (request.targetId !== userId) {
      throw new HttpError(403, "No eres el destinatario de esta solicitud");
    }
    if (request.status !== "pending") {
      throw new HttpError(409, "La solicitud ya fue respondida");
    }

    request.status = dto.action === "accept" ? "accepted" : "rejected";
    request.respondedAt = new Date();
    await connectionsCol.doc(request.id).update({ status: request.status, respondedAt: request.respondedAt });

    return request.status === "accepted"
      ? { message: "Solicitud actualizada", status: "accepted", connectionId: request.id }
      : { message: "Solicitud actualizada", status: "rejected" };
  },

  // Elimina una conexión aceptada (cualquiera de los dos) o cancela una solicitud
  // pendiente (solo quien la envió; el receptor debe rechazarla con PATCH)
  async deleteConnection(userId: string, connectionId: string): Promise<DeleteConnectionResponseDto> {
    const connection = await findConnection(connectionId, "Conexión no encontrada");
    if (connection.status === "rejected") throw new HttpError(404, "Conexión no encontrada");

    const allowed =
      connection.status === "accepted" ? involves(connection, userId) : connection.requesterId === userId;
    if (!allowed) throw new HttpError(403, "No tienes permisos sobre esta conexión");

    await connectionsCol.doc(connection.id).delete();
    return { message: "Conexión eliminada correctamente", deletedId: connection.id };
  },
};
