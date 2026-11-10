import { ConnectionAction } from "./connection.model";

// ---- Compañeros (GET /api/peers) ----
export interface ListPeersFilters {
  career?: string;
  subjectCode?: string;
  search?: string;
  page: number;
  limit: number;
}

export type PeerConnectionStatus = "none" | "pending" | "connected";

export interface PeerDto {
  id: string;
  name: string;
  career: string;
  semester: number;
  sharedSubjects: string[]; // nombres de las materias en común (mismo código)
  connectionStatus: PeerConnectionStatus;
}

export interface ListPeersResponseDto {
  data: PeerDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
// ---- Red de contactos (GET /api/connections) ----
export interface ListConnectionsFilters {
  status?: "accepted" | "pending";
}

export interface ConnectionPeerDto {
  id: string;
  name: string;
  career: string;
  avatarUrl?: string;
}

export interface ConnectionItemDto {
  connectionId: string;
  peer: ConnectionPeerDto;
  since: string;
}

export interface PendingRequestDto {
  requestId: string;
  direction: "sent" | "received";
  peer: ConnectionPeerDto;
  message: string;
  createdAt: string;
}

export interface ListConnectionsResponseDto {
  connections: ConnectionItemDto[];
  pendingRequests: PendingRequestDto[];
}
// ---- Enviar solicitud (POST /api/connections/requests) ----
export interface CreateConnectionRequestDto {
  targetUserId: number;
  message?: string;
}

export interface CreateConnectionRequestResponseDto {
  message: string;
  request: {
    id: string;
    targetUserId: string;
    status: "pending";
    createdAt: string;
  };
}
// ---- Responder solicitud (PATCH /api/connections/requests/:requestId) ----
export interface RespondConnectionRequestDto {
  action: ConnectionAction;
}

export interface RespondConnectionRequestResponseDto {
  message: string;
  status: "accepted" | "rejected";
  connectionId?: string; // solo si se aceptó
}
// ---- Eliminar conexión / cancelar solicitud (DELETE /api/connections/:connectionId) ----
export interface DeleteConnectionResponseDto {
  message: string;
  deletedId: string;
}
