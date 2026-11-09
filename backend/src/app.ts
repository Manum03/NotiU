import express from "express";
import path from "node:path";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { authRouter } from "./routes/auth.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { profileRouter } from "./routes/profile.routes";
import { settingsRouter } from "./routes/settings.routes";
import { subjectsRouter } from "./routes/subjects.routes";
import { gradesRouter } from "./routes/grades.routes";

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
app.use("/api/grades", gradesRouter);

app.use(notFoundHandler);
app.use(errorHandler);