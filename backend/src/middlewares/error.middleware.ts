import { NextFunction, Request, Response } from "express";
import { ErrorResponseDto } from "../models/auth.dto";
import { HttpError } from "../utils/http-error";

export const notFoundHandler = (req: Request, res: Response<ErrorResponseDto>): void => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response<ErrorResponseDto>,
  _next: NextFunction,
): void => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  // JSON mal formado en el body
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};
