import { Request, Response } from "express";
import { AuthLocals } from "../middlewares/auth.middleware";
import { ProfileResponseDto, UpdateProfileResponseDto } from "../models/profile.dto";
import { profileService } from "../services/profile.service";
import { validateUpdateProfile } from "../utils/validators";

export const profileController = {
  get(_req: Request, res: Response<ProfileResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    res.status(200).json(profileService.getProfile(session.userId));
  },

  update(req: Request, res: Response<UpdateProfileResponseDto>): void {
    const { session } = res.locals as AuthLocals;
    const dto = validateUpdateProfile(req.body); // valida y filtra el body
    res.status(200).json(profileService.updateProfile(session.userId, dto));
  },
};