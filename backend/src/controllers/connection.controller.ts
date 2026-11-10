import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  CreateConnectionRequestResponseDto,
  DeleteConnectionResponseDto,
  ListConnectionsResponseDto,
  ListPeersResponseDto,
  RespondConnectionRequestResponseDto,
} from "../models/connection.dto";
import { connectionService } from "../services/connection.service";
import {
  validateCreateConnectionRequest,
  validateListConnectionsQuery,
  validateListPeersQuery,
  validateRespondConnectionRequest,
  validateUuidParam,
} from "../utils/validators";

export const connectionController = {
  listPeers(req: Request, res: Response<ListPeersResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListPeersQuery(req.query); // valida los query params
    res.status(200).json(connectionService.listPeers(session.userId, filters));
  },

  list(req: Request, res: Response<ListConnectionsResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const filters = validateListConnectionsQuery(req.query); // valida los query params
    res.status(200).json(connectionService.listConnections(session.userId, filters));
  },

  createRequest(req: Request, res: Response<CreateConnectionRequestResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateConnectionRequest(req.body); // valida y filtra el body
    res.status(201).json(connectionService.createRequest(session.userId, dto));
  },

  respondRequest(req: Request, res: Response<RespondConnectionRequestResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const requestId = validateUuidParam(req.params.requestId, "requestId"); // 400 si el ID no es UUID
    const dto = validateRespondConnectionRequest(req.body); // 400 si la acción es inválida
    res.status(200).json(connectionService.respondRequest(session.userId, requestId, dto));
  },

  remove(req: Request, res: Response<DeleteConnectionResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const connectionId = validateUuidParam(req.params.connectionId, "connectionId"); // 400 si el ID no es UUID
    res.status(200).json(connectionService.deleteConnection(session.userId, connectionId));
  },
};
