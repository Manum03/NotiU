import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { ProfileResponseDto } from "../models/profile.dto";
import { profileService } from "../services/profile.service";

export const profileController = {
  get(_req: Request, res: Response<ProfileResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(profileService.getProfile(session.userId));
  },
};