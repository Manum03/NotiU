import { Router } from "express";
import { deviceController } from "../controllers/device.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.post("/", deviceController.register);
// DELETE con body { token } (el token tiene caracteres como [ ] que no conviene poner en la URL)
devicesRouter.delete("/", deviceController.unregister);
