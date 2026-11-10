export const CONNECTION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const CONNECTION_ACTIONS = ["accept", "reject"] as const;
export type ConnectionAction = (typeof CONNECTION_ACTIONS)[number];

// Una solicitud aceptada ES la conexión: el id de la solicitud y el de la conexión coinciden
export interface Connection {
  id: string;
  requesterId: number; // quien envía la solicitud
  targetId: number; // quien la recibe (el único que puede aceptarla o rechazarla)
  message: string;
  status: ConnectionStatus;
  createdAt: Date;
  respondedAt: Date | null;
}
