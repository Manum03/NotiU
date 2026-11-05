import express from "express";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { authRouter } from "./routes/auth.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { profileRouter } from "./routes/profile.routes";   
import { settingsRouter } from "./routes/settings.routes"; 

export const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/profile", profileRouter);

app.use("/api/settings", settingsRouter);  

app.use(notFoundHandler);
app.use(errorHandler);