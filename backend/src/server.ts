import { app } from "./app";
import { config } from "./config/env";
import { startJobs } from "./jobs";
import { tipService } from "./services/tip.service";

const main = async (): Promise<void> => {
  // Siembra el catálogo de tips si la colección está vacía
  await tipService.ensureCatalog();

  app.listen(config.port, () => {
    console.log(`NotiU API escuchando en http://localhost:${config.port}`);
    startJobs();
  });
};

main().catch((err) => {
  console.error("No se pudo iniciar el servidor", err);
  process.exit(1);
});
