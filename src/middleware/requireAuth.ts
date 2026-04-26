import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { verifyToken } from "../services/auth.service";
import { unauthorized } from "../lib/errors";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    userEmail?: string;
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[env.cookieName];
  if (!token) return next(unauthorized());
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    next(unauthorized("Invalid or expired session"));
  }
}
