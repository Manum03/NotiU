import { IntegrationProvider } from "../../models/integration.model";
import { classroomConnector } from "./classroom.connector";
import { moodleIcalConnector } from "./moodle-ical.connector";
import { TaskConnector } from "./types";

// Registro de conectores disponibles. Para agregar una plataforma nueva:
// 1) crear su conector implementando TaskConnector, 2) registrarlo aquí,
// 3) agregar el proveedor en INTEGRATION_PROVIDERS (models/integration.model.ts).
export const connectors: Record<IntegrationProvider, TaskConnector> = {
  moodle: moodleIcalConnector,
  classroom: classroomConnector,
};
