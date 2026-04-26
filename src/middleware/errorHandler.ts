import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors";
import { isProd } from "../config/env";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: "Invalid request body",
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  console.error("[unhandled]", err);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: isProd ? "Something went wrong" : String(err?.message ?? err),
    },
  });
};
