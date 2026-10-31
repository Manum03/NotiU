import express from "express";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { authRouter } from "./routes/auth.routes";

export const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

app.use(notFoundHandler);
app.use(errorHandler);
