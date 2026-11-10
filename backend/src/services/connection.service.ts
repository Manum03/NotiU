import { randomUUID } from "node:crypto";
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
import { fold, normalize } from "../utils/text";
import { authService } from "./auth.service";
import { profileService } from "./profile.service";
import { settingsService } from "./settings.service";
import { subjectService } from "./subject.service";

// ---- Almacenamiento en memoria (no hay base de datos) ----
// Los datos se pierden al reiniciar el servidor
const connections: Connection[] = [];

const involves = (c: Connection, userId: number): boolean =>
  c.requesterId === userId || c.targetId === userId;

const otherUserId = (c: Connection, userId: number): number =>
  c.requesterId === userId ? c.targetId : c.requesterId;

// Solicitud pendiente o conexión aceptada entre dos usuarios (en cualquier dirección).
// Las rechazadas no cuentan: se puede volver a enviar una solicitud
const findActiveBetween = (a: number, b: number): Connection | undefined =>
  connections.find(
    (c) =>
      c.status !== "rejected" &&
      ((c.requesterId === a && c.targetId === b) || (c.requesterId === b && c.targetId === a)),
  );

const toPeerStatus = (c: Connection | undefined): PeerConnectionStatus => {
  if (!c) return "none";
  return c.status === "accepted" ? "connected" : "pending";
};

const toConnectionPeer = (userId: number): ConnectionPeerDto => {
  const user = authService.getProfile(userId);
  const { career, avatarUrl } = profileService.getAcademicInfo(userId);
  return { id: String(user.id), name: user.name, career, avatarUrl };
};

const findConnection = (id: string, notFoundMessage: string): Connection => {
  const connection = connections.find((c) => c.id === id);
  if (!connection) throw new HttpError(404, notFoundMessage);
  return connection;
};

export const connectionService = {
  // La usa GET /api/profile para las estadísticas del perfil
  countConnections(userId: number): number {
    return connections.filter((c) => c.status === "accepted" && involves(c, userId)).length;
  },

  listPeers(userId: number, filters: ListPeersFilters): ListPeersResponseDto {
    const career = filters.career ? fold(filters.career) : undefined;
    const code = filters.subjectCode ? normalize(filters.subjectCode) : undefined;
    const term = filters.search ? fold(filters.search) : undefined;

    // Códigos de las materias del usuario, para calcular las materias en común
    const myCodes = new Set(subjectService.getOwnedSubjects(userId).map((s) => normalize(s.code)));

    const filtered: PeerDto[] = [];
    for (const user of authService.listUsers()) {
      if (user.id === userId) continue; // nunca el propio usuario
      // Ajuste de privacidad: si el estudiante no quiere aparecer, se omite
      if (!settingsService.getSettings(user.id).privacy.showProfileToPeers) continue;

      const info = profileService.getAcademicInfo(user.id);
      const peerSubjects = subjectService.getOwnedSubjects(user.id);

      if (career !== undefined && !fold(info.career).includes(career)) continue;
      if (code !== undefined && !peerSubjects.some((s) => normalize(s.code) === code)) continue;
      if (term !== undefined && !fold(user.name).includes(term)) continue;

      filtered.push({
        id: String(user.id),
        name: user.name,
        career: info.career,
        semester: info.semester,
        sharedSubjects: peerSubjects.filter((s) => myCodes.has(normalize(s.code))).map((s) => s.name),
        connectionStatus: toPeerStatus(findActiveBetween(userId, user.id)),
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

  listConnections(userId: number, filters: ListConnectionsFilters): ListConnectionsResponseDto {
    // Solo las conexiones donde el usuario es solicitante o receptor
    const mine = connections.filter((c) => involves(c, userId));

    const accepted =
      filters.status === "pending"
        ? []
        : mine
            .filter((c) => c.status === "accepted")
            .map((c) => ({
              connectionId: c.id,
              peer: toConnectionPeer(otherUserId(c, userId)),
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
              peer: toConnectionPeer(otherUserId(c, userId)),
              message: c.message,
              createdAt: c.createdAt.toISOString(),
            }));

    return { connections: accepted, pendingRequests: pending };
  },

  createRequest(userId: number, dto: CreateConnectionRequestDto): CreateConnectionRequestResponseDto {
    if (dto.targetUserId === userId) {
      throw new HttpError(400, "No puedes enviarte una solicitud a ti mismo");
    }
    authService.getProfile(dto.targetUserId); // 404 si el destinatario no existe

    const existing = findActiveBetween(userId, dto.targetUserId);
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
    connections.push(request);

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

  respondRequest(
    userId: number,
    requestId: string,
    dto: RespondConnectionRequestDto,
  ): RespondConnectionRequestResponseDto {
    const request = findConnection(requestId, "Solicitud no encontrada");
    if (request.targetId !== userId) {
      throw new HttpError(403, "No eres el destinatario de esta solicitud");
    }
    if (request.status !== "pending") {
      throw new HttpError(409, "La solicitud ya fue respondida");
    }

    request.status = dto.action === "accept" ? "accepted" : "rejected";
    request.respondedAt = new Date();

    return request.status === "accepted"
      ? { message: "Solicitud actualizada", status: "accepted", connectionId: request.id }
      : { message: "Solicitud actualizada", status: "rejected" };
  },

  // Elimina una conexión aceptada (cualquiera de los dos) o cancela una solicitud
  // pendiente (solo quien la envió; el receptor debe rechazarla con PATCH)
  deleteConnection(userId: number, connectionId: string): DeleteConnectionResponseDto {
    const connection = findConnection(connectionId, "Conexión no encontrada");
    if (connection.status === "rejected") throw new HttpError(404, "Conexión no encontrada");

    const allowed =
      connection.status === "accepted" ? involves(connection, userId) : connection.requesterId === userId;
    if (!allowed) throw new HttpError(403, "No tienes permisos sobre esta conexión");

    connections.splice(connections.indexOf(connection), 1);
    return { message: "Conexión eliminada correctamente", deletedId: connection.id };
  },
};
