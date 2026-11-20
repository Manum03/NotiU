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
  async listPeers(req: Request, res: Response<ListPeersResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListPeersQuery(req.query); // valida los query params
    res.status(200).json(await connectionService.listPeers(session.userId, filters));
  },

  async list(req: Request, res: Response<ListConnectionsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const filters = validateListConnectionsQuery(req.query); // valida los query params
    res.status(200).json(await connectionService.listConnections(session.userId, filters));
  },

  async createRequest(req: Request, res: Response<CreateConnectionRequestResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateCreateConnectionRequest(req.body); // valida y filtra el body
    res.status(201).json(await connectionService.createRequest(session.userId, dto));
  },

  async respondRequest(req: Request, res: Response<RespondConnectionRequestResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const requestId = validateUuidParam(req.params.requestId, "requestId"); // 400 si el ID no es UUID
    const dto = validateRespondConnectionRequest(req.body); // 400 si la acción es inválida
    res.status(200).json(await connectionService.respondRequest(session.userId, requestId, dto));
  },

  async remove(req: Request, res: Response<DeleteConnectionResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const connectionId = validateUuidParam(req.params.connectionId, "connectionId"); // 400 si el ID no es UUID
    res.status(200).json(await connectionService.deleteConnection(session.userId, connectionId));
  },
};
