
import express from "express";
import path from "node:path";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { authRouter } from "./routes/auth.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { profileRouter } from "./routes/profile.routes";
import { settingsRouter } from "./routes/settings.routes";
import { subjectsRouter } from "./routes/subjects.routes";
import { gradesRouter } from "./routes/grades.routes";
import { notesRouter } from "./routes/notes.routes";
import { peersRouter } from "./routes/peers.routes";
import { connectionsRouter } from "./routes/connections.routes";
import { studyGroupsRouter } from "./routes/study-groups.routes";
import { tipsRouter } from "./routes/tips.routes";
import { tasksRouter } from "./routes/tasks.routes";
import { integrationsRouter } from "./routes/integrations.routes";
import { devicesRouter } from "./routes/devices.routes";

export const app = express();

app.use(express.json());

// Sirve el frontend de prueba (carpeta backend/public)
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/profile", profileRouter);

app.use("/api/settings", settingsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/grades", gradesRouter);
app.use("/api/notes", notesRouter);
app.use("/api/peers", peersRouter);
app.use("/api/connections", connectionsRouter);
app.use("/api/study-groups", studyGroupsRouter);
app.use("/api/tips", tipsRouter);
// Integraciones con plataformas externas (Moodle, Classroom) y dispositivos para push
app.use("/api/integrations", integrationsRouter);
app.use("/api/devices", devicesRouter);

app.use(notFoundHandler);
app.use(errorHandler);
