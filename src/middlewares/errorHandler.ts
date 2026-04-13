import { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error("[ErrorHandler]", err);

  const status = err.statusCode || err.status || 500;

  res.status(status).json({
    error: true,
    message: err.message || "Internal Server Error",
  });
}
