import { Router } from "express";
import { tipController } from "../controllers/tip.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const tipsRouter = Router();

tipsRouter.use(requireAuth);

tipsRouter.get("/", tipController.list);

// Debe ir antes de /:tipId para que "tags" no se tome como un ID
tipsRouter.get("/tags", tipController.listTags);

tipsRouter.get("/:tipId", tipController.get);

tipsRouter.post("/:tipId/save", tipController.save);

tipsRouter.delete("/:tipId/save", tipController.unsave);
