import { IntegrationProvider } from "../../models/integration.model";
import { ExternalTask, TaskSource } from "../../models/task.model";

export interface ConnectorContext {
  userId: string;
  secret: string; // ya descifrado
}

// Patrón Strategy/Adapter: cada plataforma implementa esta interfaz y el motor de
// sincronización trabaja igual con todas. Para agregar Teams o Gmail, basta con
// crear un nuevo conector y registrarlo en connectors/index.ts.
export interface TaskConnector {
  provider: IntegrationProvider;
  source: TaskSource;
  fetchTasks(ctx: ConnectorContext): Promise<ExternalTask[]>;
}

// El usuario debe volver a conectar la integración (token revocado, URL ya no válida)
export class ReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReauthRequiredError";
  }
}

// Error con un mensaje apto para mostrar al usuario
export class ConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorError";
  }
}
