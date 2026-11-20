import { Router } from "express";
import { integrationController } from "../controllers/integration.controller";
import { requireAuth } from "../middlewares/auth.middleware";

// "Integraciones" = enlazar plataformas externas (Moodle, Classroom).
// No confundir con /api/connections, que son conexiones entre estudiantes.
export const integrationsRouter = Router();

integrationsRouter.use(requireAuth);

integrationsRouter.get("/", integrationController.list);
integrationsRouter.put("/moodle", integrationController.connectMoodle);
integrationsRouter.post("/classroom", integrationController.connectClassroom);
integrationsRouter.post("/:provider/sync", integrationController.sync);
integrationsRouter.delete("/:provider", integrationController.disconnect);
