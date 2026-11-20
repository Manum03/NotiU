import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import {
  ConnectResponseDto,
  ListIntegrationsResponseDto,
  SyncResultDto,
} from "../models/integration.dto";
import { integrationService } from "../services/integration.service";
import {
  validateConnectClassroom,
  validateConnectMoodle,
  validateProvider,
} from "../utils/integration.validators";

export const integrationController = {
  async list(_req: Request, res: Response<ListIntegrationsResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(await integrationService.list(session.userId));
  },

  // PUT: conectar o reemplazar el enlace del calendario
  async connectMoodle(req: Request, res: Response<ConnectResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateConnectMoodle(req.body);
    res.status(200).json(await integrationService.connectMoodle(session.userId, dto.icalUrl));
  },

  async connectClassroom(req: Request, res: Response<ConnectResponseDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const dto = validateConnectClassroom(req.body);
    res.status(200).json(await integrationService.connectClassroom(session.userId, dto.serverAuthCode));
  },

  async sync(req: Request, res: Response<SyncResultDto>): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const provider = validateProvider(req.params.provider);
    res.status(200).json(await integrationService.syncNow(session.userId, provider));
  },

  async disconnect(req: Request, res: Response): Promise<void> {
    const { session } = res.locals as AuthLocals;
    const provider = validateProvider(req.params.provider);
    res.status(200).json(await integrationService.disconnect(session.userId, provider));
  },
};
