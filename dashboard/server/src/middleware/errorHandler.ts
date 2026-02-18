import { Request, Response, NextFunction } from "express";

export interface GraphApiError {
  statusCode: number;
  code: string;
  message: string;
  requestId?: string;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  requestId?: string;

  constructor(statusCode: number, code: string, message: string, requestId?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
    this.name = "ApiError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`, err instanceof ApiError ? {
    statusCode: err.statusCode,
    code: err.code,
    requestId: err.requestId,
  } : { stack: err.stack });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: err.requestId,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "InternalServerError",
      message: "An unexpected error occurred",
    },
  });
}
